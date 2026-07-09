import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, events, registrations, favorites, reviews, networking } from "./src/db/schema.ts";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "mock-key" });

async function initDb() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar TEXT,
        city TEXT,
        state TEXT,
        bio TEXT,
        interests JSONB DEFAULT '[]'::jsonb,
        role TEXT DEFAULT 'attendee',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        banner TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        address TEXT NOT NULL,
        modality TEXT NOT NULL,
        price_type TEXT NOT NULL,
        price TEXT,
        capacity INT NOT NULL,
        enrolled_count INT DEFAULT 0,
        organizer_id INT REFERENCES users(id),
        organizer_name TEXT NOT NULL,
        speakers JSONB DEFAULT '[]'::jsonb,
        schedule JSONB DEFAULT '[]'::jsonb,
        category TEXT NOT NULL,
        rating NUMERIC(3,2) DEFAULT 4.8,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) NOT NULL,
        event_id INT REFERENCES events(id) NOT NULL,
        status TEXT DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) NOT NULL,
        event_id INT REFERENCES events(id) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) NOT NULL,
        event_id INT REFERENCES events(id) NOT NULL,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS networking (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) NOT NULL,
        target_user_id INT REFERENCES users(id) NOT NULL,
        event_id INT REFERENCES events(id) NOT NULL,
        status TEXT DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Database tables verified/created successfully.");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
}

// Seed initial events if table is empty
async function seedDatabase() {
  try {
    await initDb();
    const existingEvents = await db.select().from(events).limit(1);
    if (existingEvents.length === 0) {
      console.log("Seeding initial events into database...");
      
      // Ensure default organizer user
      let [organizer] = await db.select().from(users).where(eq(users.email, "admin@conectatech.com"));
      if (!organizer) {
        [organizer] = await db.insert(users).values({
          uid: "system_admin_uid_123",
          name: "Equipe ConectaTech",
          email: "admin@conectatech.com",
          avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
          city: "São Paulo",
          state: "SP",
          bio: "Organização oficial de eventos de tecnologia ConectaTech.",
          interests: ["Inteligência Artificial", "Cloud", "DevOps"],
          role: "organizer"
        }).returning();
      }

      const seedData = [
        {
          title: "AI Summit Brasil 2026",
          description: "O maior congresso de Inteligência Artificial e Machine Learning da América Latina. Descubra as últimas tendências em LLMs, agentes autônomos, IA generativa e ética em sistemas inteligentes.",
          banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
          date: "2026-07-20",
          time: "09:00",
          city: "São Paulo",
          state: "SP",
          address: "WTC Events Center, Av. das Nações Unidas, 12551",
          modality: "Presencial",
          priceType: "Pago",
          price: "R$ 150,00",
          capacity: 500,
          enrolledCount: 342,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Inteligência Artificial",
          rating: "4.9",
          speakers: [
            { name: "Dra. Carolina Mendes", role: "Head of AI Research", company: "DeepTech Labs", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" },
            { name: "Lucas Silveira", role: "Principal AI Engineer", company: "Global Cloud", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "09:00", title: "Credenciamento e Café de Boas-Vindas", description: "Networking inicial" },
            { time: "10:00", title: "O Futuro dos Agentes de IA Autônomos", description: "Palestra magna com Dra. Carolina Mendes" },
            { time: "12:00", title: "Almoço e Demonstrações de Startups", description: "Área de expositores" }
          ]
        },
        {
          title: "Cloud & DevOps Masters 2026",
          description: "Imersão completa em arquiteturas cloud-native, Kubernetes, automação de infraestrutura com Terraform e práticas avançadas de SRE.",
          banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
          date: "2026-07-25",
          time: "14:00",
          city: "Rio de Janeiro",
          state: "RJ",
          address: "Transmissão ao vivo via Zoom & YouTube",
          modality: "Online",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 2000,
          enrolledCount: 1450,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Cloud",
          rating: "4.8",
          speakers: [
            { name: "Marcos Vinicius", role: "Cloud Architect", company: "DevOps Brasil", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "14:00", title: "Abertura Oficial Cloud Native", description: "Panorama atual de microsserviços" },
            { time: "15:30", title: "Kubernetes em Escala Global", description: "Desafios de resiliência e multi-cloud" }
          ]
        },
        {
          title: "UX/UI Design System Conf",
          description: "Como criar, escalar e manter Design Systems robustos que unificam equipes de produto e engenharia em grandes empresas.",
          banner: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-02",
          time: "10:00",
          city: "Florianópolis",
          state: "SC",
          address: "Centro de Inovação ACATE, SC-401",
          modality: "Presencial",
          priceType: "Pago",
          price: "R$ 80,00",
          capacity: 250,
          enrolledCount: 198,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "UX/UI",
          rating: "4.7",
          speakers: [
            { name: "Beatriz Lima", role: "Design Director", company: "UX Studio", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "10:00", title: "Anatomia de um Design System de Sucesso", description: "Tokens, variáveis e componentes acessíveis" }
          ]
        },
        {
          title: "FullStack Web Experience",
          description: "Explore as novidades do ecossistema React, Next.js, Server Actions, TypeScript rigoroso e padrões de alta performance para web.",
          banner: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-10",
          time: "19:00",
          city: "Curitiba",
          state: "PR",
          address: "Engenho Park, Rua Major Heitor Guimarães, 1740",
          modality: "Presencial",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 300,
          enrolledCount: 280,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Desenvolvimento Web",
          rating: "4.9",
          speakers: [
            { name: "Rafael Souza", role: "Senior Frontend Lead", company: "WebCoders", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "19:00", title: "Arquitetura Frontend Moderna em 2026", description: "Otimização de Server Components e Web Vitals" }
          ]
        },
        {
          title: "Data & Big Data Expo",
          description: "Pipelines de dados em tempo real, Data Lakehouse, governança de dados e engenharia analítica com dbt e Spark.",
          banner: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-18",
          time: "13:30",
          city: "Belo Horizonte",
          state: "MG",
          address: "Online - YouTube ConectaTech",
          modality: "Online",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 1500,
          enrolledCount: 920,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Dados",
          rating: "4.6",
          speakers: [
            { name: "Juliana Castro", role: "Data Engineering Lead", company: "DataCorp", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "13:30", title: "Modern Data Stack na Prática", description: "Arquiteturas modernas de ingestão" }
          ]
        },
        {
          title: "CyberSecurity & DevSecOps Forum",
          description: "Proteção de aplicações corporativas, testes de intrusão automatizados, conformidade com LGPD e resposta a incidentes de segurança.",
          banner: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-25",
          time: "09:30",
          city: "Porto Alegre",
          state: "RS",
          address: "Hotel Sheraton Porto Alegre",
          modality: "Presencial",
          priceType: "Pago",
          price: "R$ 100,00",
          capacity: 200,
          enrolledCount: 150,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Segurança",
          rating: "4.9",
          speakers: [
            { name: "Alexandre Dorneles", role: "CISO & Security Expert", company: "CyberShield", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "09:30", title: "Zero Trust Architecture", description: "Implementando segurança em camadas" }
          ]
        },
        {
          title: "Mobile Dev Summit 2026",
          description: "O principal encontro de desenvolvedores iOS e Android do Brasil. Novidades em Swift, Kotlin Multiplatform, arquitetura modular e performance mobile.",
          banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200",
          date: "2026-07-15",
          time: "09:00",
          city: "São Paulo",
          state: "SP",
          address: "Centro de Convenções Rebouças",
          modality: "Presencial",
          priceType: "Pago",
          price: "R$ 120,00",
          capacity: 350,
          enrolledCount: 290,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Mobile",
          rating: "4.8",
          speakers: [
            { name: "Camila Ribeiro", role: "Senior Mobile Engineer", company: "AppBuilder", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "09:00", title: "Kotlin Multiplatform em Produção", description: "Compartilhando lógica entre iOS e Android com segurança" }
          ]
        },
        {
          title: "LLM & GenAI Hands-on Workshop",
          description: "Aprenda a fazer fine-tuning de modelos open-source, criar pipelines RAG avançados e integrar function calling em aplicações reais.",
          banner: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200",
          date: "2026-07-18",
          time: "14:00",
          city: "Rio de Janeiro",
          state: "RJ",
          address: "Online - Transmissão interativa",
          modality: "Online",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 1000,
          enrolledCount: 850,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Inteligência Artificial",
          rating: "5.0",
          speakers: [
            { name: "Bruno Vasconcelos", role: "AI Researcher", company: "GenAI Institute", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "14:00", title: "Construindo Sistemas RAG Escaláveis", description: "Vetores, embeddings e recuperação precisa" }
          ]
        },
        {
          title: "Carreira Tech: Liderança e Gestão Ágil",
          description: "Transição de carreira para cargos de liderança técnica (Tech Lead, Engineering Manager e CTO). Habilidades de comunicação e gestão de equipes.",
          banner: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-05",
          time: "19:00",
          city: "Florianópolis",
          state: "SC",
          address: "ACATE Tech Hub",
          modality: "Presencial",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 150,
          enrolledCount: 140,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Carreira",
          rating: "4.9",
          speakers: [
            { name: "Patricia Gomes", role: "VP of Engineering", company: "ScaleUp Brasil", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "19:00", title: "De Desenvolvedor a Líder Técnico", description: "Desafios e soft skills essenciais" }
          ]
        },
        {
          title: "FinOps & Cloud Cost Optimization",
          description: "Estratégias avançadas para reduzir custos em ambientes AWS, Google Cloud e Azure sem perder performance ou resiliência.",
          banner: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
          date: "2026-08-12",
          time: "10:00",
          city: "Belo Horizonte",
          state: "MG",
          address: "Online via ConectaTech Meet",
          modality: "Online",
          priceType: "Gratuito",
          price: "Gratuito",
          capacity: 800,
          enrolledCount: 420,
          organizerId: organizer.id,
          organizerName: organizer.name,
          category: "Cloud",
          rating: "4.7",
          speakers: [
            { name: "Diego Martins", role: "Cloud FinOps Specialist", company: "CloudWise", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" }
          ],
          schedule: [
            { time: "10:00", title: "Identificando Desperdícios na nuvem", description: "Ferramentas e métricas de controle financeiro" }
          ]
        }
      ];

      for (const ev of seedData) {
        const [existing] = await db.select().from(events).where(eq(events.title, ev.title));
        if (!existing) {
          await db.insert(events).values(ev);
        }
      }
      console.log("Database seeded successfully with fictitious events!");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

seedDatabase();

const fallbackEvents = [
  {
    id: 1,
    title: "AI Summit Brasil 2026",
    description: "O maior congresso de Inteligência Artificial e Machine Learning da América Latina. Descubra as últimas tendências em LLMs, agentes autônomos, IA generativa e ética em sistemas inteligentes.",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
    date: "2026-07-20",
    time: "09:00",
    city: "São Paulo",
    state: "SP",
    address: "WTC Events Center, Av. das Nações Unidas, 12551",
    modality: "Presencial",
    priceType: "Pago",
    price: "R$ 150,00",
    capacity: 500,
    enrolledCount: 342,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Inteligência Artificial",
    rating: "4.9",
    speakers: [
      { name: "Dra. Carolina Mendes", role: "Head of AI Research", company: "DeepTech Labs", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" },
      { name: "Lucas Silveira", role: "Principal AI Engineer", company: "Global Cloud", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "09:00", title: "Credenciamento e Café de Boas-Vindas", description: "Networking inicial" },
      { time: "10:00", title: "O Futuro dos Agentes de IA Autônomos", description: "Palestra magna com Dra. Carolina Mendes" }
    ]
  },
  {
    id: 2,
    title: "Cloud & DevOps Masters 2026",
    description: "Imersão completa em arquiteturas cloud-native, Kubernetes, automação de infraestrutura com Terraform e práticas avançadas de SRE.",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
    date: "2026-07-25",
    time: "14:00",
    city: "Rio de Janeiro",
    state: "RJ",
    address: "Transmissão ao vivo via Zoom & YouTube",
    modality: "Online",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 2000,
    enrolledCount: 1450,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Cloud",
    rating: "4.8",
    speakers: [
      { name: "Marcos Vinicius", role: "Cloud Architect", company: "DevOps Brasil", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "14:00", title: "Abertura Oficial Cloud Native", description: "Panorama atual de microsserviços" }
    ]
  },
  {
    id: 3,
    title: "UX/UI Design System Conf",
    description: "Como criar, escalar e manter Design Systems robustos que unificam equipes de produto e engenharia em grandes empresas.",
    banner: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-02",
    time: "10:00",
    city: "Florianópolis",
    state: "SC",
    address: "Centro de Inovação ACATE, SC-401",
    modality: "Presencial",
    priceType: "Pago",
    price: "R$ 80,00",
    capacity: 250,
    enrolledCount: 198,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "UX/UI",
    rating: "4.7",
    speakers: [
      { name: "Beatriz Lima", role: "Design Director", company: "UX Studio", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "10:00", title: "Anatomia de um Design System de Sucesso", description: "Tokens, variáveis e componentes acessíveis" }
    ]
  },
  {
    id: 4,
    title: "FullStack Web Experience",
    description: "Explore as novidades do ecossistema React, Next.js, Server Actions, TypeScript rigoroso e padrões de alta performance para web.",
    banner: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-10",
    time: "19:00",
    city: "Curitiba",
    state: "PR",
    address: "Engenho Park, Rua Major Heitor Guimarães, 1740",
    modality: "Presencial",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 300,
    enrolledCount: 280,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Desenvolvimento Web",
    rating: "4.9",
    speakers: [
      { name: "Rafael Souza", role: "Senior Frontend Lead", company: "WebCoders", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "19:00", title: "Arquitetura Frontend Moderna em 2026", description: "Otimização de Server Components e Web Vitals" }
    ]
  },
  {
    id: 5,
    title: "Data & Big Data Expo",
    description: "Pipelines de dados em tempo real, Data Lakehouse, governança de dados e engenharia analítica com dbt e Spark.",
    banner: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-18",
    time: "13:30",
    city: "Belo Horizonte",
    state: "MG",
    address: "Online - YouTube ConectaTech",
    modality: "Online",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 1500,
    enrolledCount: 920,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Dados",
    rating: "4.6",
    speakers: [
      { name: "Juliana Castro", role: "Data Engineering Lead", company: "DataCorp", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "13:30", title: "Modern Data Stack na Prática", description: "Arquiteturas modernas de ingestão" }
    ]
  },
  {
    id: 6,
    title: "CyberSecurity & DevSecOps Forum",
    description: "Proteção de aplicações corporativas, testes de intrusão automatizados, conformidade com LGPD e resposta a incidentes de segurança.",
    banner: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-25",
    time: "09:30",
    city: "Porto Alegre",
    state: "RS",
    address: "Hotel Sheraton Porto Alegre",
    modality: "Presencial",
    priceType: "Pago",
    price: "R$ 100,00",
    capacity: 200,
    enrolledCount: 150,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Segurança",
    rating: "4.9",
    speakers: [
      { name: "Alexandre Dorneles", role: "CISO & Security Expert", company: "CyberShield", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "09:30", title: "Zero Trust Architecture", description: "Implementando segurança em camadas" }
    ]
  },
  {
    id: 7,
    title: "Mobile Dev Summit 2026",
    description: "O principal encontro de desenvolvedores iOS e Android do Brasil. Novidades em Swift, Kotlin Multiplatform, arquitetura modular e performance mobile.",
    banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200",
    date: "2026-07-15",
    time: "09:00",
    city: "São Paulo",
    state: "SP",
    address: "Centro de Convenções Rebouças",
    modality: "Presencial",
    priceType: "Pago",
    price: "R$ 120,00",
    capacity: 350,
    enrolledCount: 290,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Mobile",
    rating: "4.8",
    speakers: [
      { name: "Camila Ribeiro", role: "Senior Mobile Engineer", company: "AppBuilder", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "09:00", title: "Kotlin Multiplatform em Produção", description: "Compartilhando lógica entre iOS e Android com segurança" }
    ]
  },
  {
    id: 8,
    title: "LLM & GenAI Hands-on Workshop",
    description: "Aprenda a fazer fine-tuning de modelos open-source, criar pipelines RAG avançados e integrar function calling em aplicações reais.",
    banner: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200",
    date: "2026-07-18",
    time: "14:00",
    city: "Rio de Janeiro",
    state: "RJ",
    address: "Online - Transmissão interativa",
    modality: "Online",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 1000,
    enrolledCount: 850,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Inteligência Artificial",
    rating: "5.0",
    speakers: [
      { name: "Bruno Vasconcelos", role: "AI Researcher", company: "GenAI Institute", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "14:00", title: "Construindo Sistemas RAG Escaláveis", description: "Vetores, embeddings e recuperação precisa" }
    ]
  },
  {
    id: 9,
    title: "Carreira Tech: Liderança e Gestão Ágil",
    description: "Transição de carreira para cargos de liderança técnica (Tech Lead, Engineering Manager e CTO). Habilidades de comunicação e gestão de equipes.",
    banner: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-05",
    time: "19:00",
    city: "Florianópolis",
    state: "SC",
    address: "ACATE Tech Hub",
    modality: "Presencial",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 150,
    enrolledCount: 140,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Carreira",
    rating: "4.9",
    speakers: [
      { name: "Patricia Gomes", role: "VP of Engineering", company: "ScaleUp Brasil", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "19:00", title: "De Desenvolvedor a Líder Técnico", description: "Desafios e soft skills essenciais" }
    ]
  },
  {
    id: 10,
    title: "FinOps & Cloud Cost Optimization",
    description: "Estratégias avançadas para reduzir custos em ambientes AWS, Google Cloud e Azure sem perder performance ou resiliência.",
    banner: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
    date: "2026-08-12",
    time: "10:00",
    city: "Belo Horizonte",
    state: "MG",
    address: "Online via ConectaTech Meet",
    modality: "Online",
    priceType: "Gratuito",
    price: "Gratuito",
    capacity: 800,
    enrolledCount: 420,
    organizerId: 1,
    organizerName: "Equipe ConectaTech",
    category: "Cloud",
    rating: "4.7",
    speakers: [
      { name: "Diego Martins", role: "Cloud FinOps Specialist", company: "CloudWise", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150" }
    ],
    schedule: [
      { time: "10:00", title: "Identificando Desperdícios na nuvem", description: "Ferramentas e métricas de controle financeiro" }
    ]
  }
];

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get all events with filters
app.get("/api/events", async (req, res) => {
  try {
    const { category, city, state, modality, priceType, search, date } = req.query;
    
    let allEvents;
    try {
      allEvents = await db.select().from(events).orderBy(desc(events.date));
    } catch (dbErr) {
      console.warn("DB not connected or table missing, using fallback events");
      allEvents = fallbackEvents;
    }

    if (!allEvents || allEvents.length === 0) {
      allEvents = fallbackEvents;
    }
    
    let filtered = allEvents;
    
    if (category && category !== "Todos") {
      filtered = filtered.filter(e => e.category === category);
    }
    if (city && city !== "Todas") {
      filtered = filtered.filter(e => e.city.toLowerCase().includes(String(city).toLowerCase()));
    }
    if (state && state !== "Todos") {
      filtered = filtered.filter(e => e.state === state);
    }
    if (modality && modality !== "Todas") {
      filtered = filtered.filter(e => e.modality === modality);
    }
    if (priceType && priceType !== "Todos") {
      filtered = filtered.filter(e => e.priceType === priceType);
    }
    if (date) {
      filtered = filtered.filter(e => e.date === date);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.city.toLowerCase().includes(q));
    }
    
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.json(fallbackEvents);
  }
});

// Get single event
app.get("/api/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    let event;
    try {
      const [dbEvent] = await db.select().from(events).where(eq(events.id, eventId));
      event = dbEvent;
    } catch (dbErr) {
      event = fallbackEvents.find(e => e.id === eventId);
    }
    if (!event) {
      event = fallbackEvents.find(e => e.id === eventId);
    }
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    const eventId = parseInt(req.params.id);
    const event = fallbackEvents.find(e => e.id === eventId);
    if (event) {
      res.json(event);
    } else {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  }
});

// Create event (Organizer)
app.post("/api/events", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, description, banner, date, time, city, state, address, modality, priceType, price, capacity, category, speakers, schedule } = req.body;
    const dbUser = req.dbUser!;

    const [newEvent] = await db.insert(events).values({
      title,
      description,
      banner: banner || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200",
      date,
      time,
      city,
      state,
      address,
      modality,
      priceType,
      price: priceType === "Gratuito" ? "Gratuito" : price,
      capacity: parseInt(capacity) || 100,
      enrolledCount: 0,
      organizerId: dbUser.id,
      organizerName: dbUser.name,
      category,
      speakers: speakers || [],
      schedule: schedule || []
    }).returning();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Register for event
app.post("/api/events/:id/register", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const dbUser = req.dbUser!;

    // Check if already registered
    const [existing] = await db.select().from(registrations).where(and(eq(registrations.userId, dbUser.id), eq(registrations.eventId, eventId)));
    if (existing) {
      return res.status(400).json({ error: "Already registered for this event" });
    }

    const [reg] = await db.insert(registrations).values({
      userId: dbUser.id,
      eventId,
      status: "confirmed"
    }).returning();

    // Increment enrolledCount
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (ev) {
      await db.update(events).set({ enrolledCount: (ev.enrolledCount || 0) + 1 }).where(eq(events.id, eventId));
    }

    res.status(201).json(reg);
  } catch (error) {
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Failed to register" });
  }
});

// Cancel registration
app.delete("/api/events/:id/register", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const dbUser = req.dbUser!;

    await db.delete(registrations).where(and(eq(registrations.userId, dbUser.id), eq(registrations.eventId, eventId)));

    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (ev && ev.enrolledCount && ev.enrolledCount > 0) {
      await db.update(events).set({ enrolledCount: ev.enrolledCount - 1 }).where(eq(events.id, eventId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Get user registrations / history
app.get("/api/my-registrations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const userRegs = await db.select().from(registrations).where(eq(registrations.userId, dbUser.id));
    
    const eventIds = userRegs.map(r => r.eventId);
    if (eventIds.length === 0) {
      return res.json([]);
    }

    const evs = await db.select().from(events);
    const registeredEvents = evs.filter(e => eventIds.includes(e.id));
    
    res.json(registeredEvents);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// Favorites (GET, POST, DELETE)
app.get("/api/favorites", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const userFavs = await db.select().from(favorites).where(eq(favorites.userId, dbUser.id));
    const eventIds = userFavs.map(f => f.eventId);
    if (eventIds.length === 0) return res.json([]);

    const evs = await db.select().from(events);
    const favEvents = evs.filter(e => eventIds.includes(e.id));
    res.json(favEvents);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.post("/api/favorites", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.body;
    const dbUser = req.dbUser!;

    const [existing] = await db.select().from(favorites).where(and(eq(favorites.userId, dbUser.id), eq(favorites.eventId, eventId)));
    if (existing) {
      return res.json(existing);
    }

    const [fav] = await db.insert(favorites).values({
      userId: dbUser.id,
      eventId
    }).returning();

    res.status(201).json(fav);
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

app.delete("/api/favorites/:eventId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const dbUser = req.dbUser!;
    await db.delete(favorites).where(and(eq(favorites.userId, dbUser.id), eq(favorites.eventId, eventId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// Reviews
app.get("/api/events/:id/reviews", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const eventReviews = await db.select().from(reviews).where(eq(reviews.eventId, eventId));
    
    // Attach user names/avatars
    const allUsers = await db.select().from(users);
    const enriched = eventReviews.map(r => {
      const u = allUsers.find(user => user.id === r.userId);
      return {
        ...r,
        userName: u?.name || "Usuário",
        userAvatar: u?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.post("/api/events/:id/reviews", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    const dbUser = req.dbUser!;

    const [rev] = await db.insert(reviews).values({
      userId: dbUser.id,
      eventId,
      rating: parseInt(rating) || 5,
      comment
    }).returning();

    res.status(201).json(rev);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// Networking suggestions & connections
app.get("/api/networking/suggestions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const allUsers = await db.select().from(users);
    // Suggest other users except current user
    const others = allUsers.filter(u => u.id !== dbUser.id);
    res.json(others);
  } catch (error) {
    console.error("Error fetching networking suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

app.post("/api/networking", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetUserId, eventId, message } = req.body;
    const dbUser = req.dbUser!;

    const [conn] = await db.insert(networking).values({
      userId: dbUser.id,
      targetUserId: parseInt(targetUserId),
      eventId: parseInt(eventId) || 1,
      message: message || "Olá! Gostaria de me conectar com você na ConectaTech.",
      status: "connected"
    }).returning();

    res.status(201).json(conn);
  } catch (error) {
    console.error("Error creating connection:", error);
    res.status(500).json({ error: "Failed to connect" });
  }
});

// User Profile
app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
  res.json(req.dbUser);
});

app.put("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { name, city, state, bio, interests, avatar } = req.body;

    const [updated] = await db.update(users).set({
      name: name || dbUser.name,
      city: city !== undefined ? city : dbUser.city,
      state: state !== undefined ? state : dbUser.state,
      bio: bio !== undefined ? bio : dbUser.bio,
      interests: interests !== undefined ? interests : dbUser.interests,
      avatar: avatar !== undefined ? avatar : dbUser.avatar
    }).where(eq(users.id, dbUser.id)).returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// AI Recommendation using Gemini
app.post("/api/ai/recommendations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const allEvents = await db.select().from(events);
    
    const userInterests = (dbUser.interests as string[])?.join(", ") || "Tecnologia geral";
    
    const prompt = `Com base nos interesses do usuário (${userInterests}) e na cidade (${dbUser.city}, ${dbUser.state}), analise estes eventos disponíveis e retorne uma recomendação personalizada em português:
Eventos disponíveis: ${JSON.stringify(allEvents.map(e => ({ id: e.id, title: e.title, category: e.category, city: e.city })))}

Retorne um texto amigável e motivador destacando qual evento é o mais recomendado e por quê.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ recommendation: response.text || "Recomendamos participar do AI Summit Brasil 2026!" });
  } catch (error) {
    console.error("Error generating AI recommendation:", error);
    res.json({ recommendation: "Com base no seu perfil, recomendamos eventos de Inteligência Artificial e Cloud." });
  }
});

async function startServer() {
  await seedDatabase();

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ConectaTech server running on http://localhost:${PORT}`);
  });
}

startServer();
