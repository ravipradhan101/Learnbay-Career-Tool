// Details of every Learnbay AI, Data and Cloud program, from each program page on learnbay.co (checked 2026-09-29).
// Durations and fees are left out on purpose (a mentor covers them). The Data Science pages' "industry projects" were
// system-design exercises reused from another page, so they are not listed. Regenerate when the site changes.

export type ProgramDetail = {
  name: string; url: string; category: string; audience: string; codingRequired: string; prerequisites: string
  liveHours: string | null; guidedProjects: string | null; modules: string[]; electives: string[]; domains: string[]
  projects: { title: string; detail: string; tools: string }[]; certifications: string[]; roles: string[]; tools: string[]
}

export const PROGRAM_DETAILS: Record<string, ProgramDetail> = {
  "genai-agentic-ai-master": {
    "name": "Generative AI and Agentic AI Master Program for Working Professionals",
    "url": "https://www.learnbay.co/genai-and-agentic-ai-master-program",
    "category": "AI",
    "audience": "mid-career working professionals with a minimum of 1+ years of IT experience",
    "codingRequired": "yes",
    "prerequisites": "one must have a basic understanding of Python, ML, and Deep Learning",
    "liveHours": "300+ live hours",
    "guidedProjects": "40+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & Automation",
      "LLMOP's & Production Deployment",
      "Ethics, Guardrails & Responsible AI"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool",
        "detail": "AI tool to screen resumes, match candidates to jobs, draft job descriptions",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator",
        "detail": "Automatically create clear financial reports from raw data",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Track and analyze progress of projects in real time",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Analyze employee feedback and surveys for trends",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "Microsoft (Azure AI Fundamentals)",
      "IBM (Gen-AI Certificate)",
      "Project certificates issued by Learnbay and leading MNCs & unicorn startups"
    ],
    "roles": [],
    "tools": [
      "Python",
      "GitHub",
      "OpenAI",
      "LangChain",
      "RAG",
      "AutoGPT",
      "Hugging Face",
      "IBM Watsonx",
      "Tableau",
      "LLMOps",
      "Responsible AI / guardrails"
    ]
  },
  "genai-agentic-ai-managers-leaders": {
    "name": "Generative AI and Agentic AI Program For Managers and Leaders",
    "url": "https://www.learnbay.co/genai-agentic-ai-managers-leaders",
    "category": "AI",
    "audience": "Any professional with years of work experience in an industry ... Mid- to senior-level experts in leadership roles",
    "codingRequired": "some",
    "prerequisites": "You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Generative AI For Managers",
      "Agentic AI",
      "Gen AI for Digital Business Transformation",
      "GenAI for Project Management"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "Resume screening / candidate matching",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Generate financial reports from raw data",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Real-time project tracking",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Sentiment analysis of employee feedback",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "IBM Certified AI Professional",
      "Certification from IBM in Generative AI"
    ],
    "roles": [],
    "tools": [
      "OpenAI APIs",
      "LangChain",
      "LLMs",
      "RAG",
      "Python",
      "GitHub",
      "Tableau",
      "IBM Watsonx",
      "Hugging Face",
      "AutoGPT",
      "forecasting / strategic decision-making"
    ]
  },
  "genai-agentic-ai-cloud-devops": {
    "name": "Generative AI and Agentic AI for Cloud & DevOps",
    "url": "https://www.learnbay.co/genai-agentic-ai-for-cloud-devops",
    "category": "AI",
    "audience": "Professionals with good knowledge in cloud and devops knowledge or with at least one year of work experience in the same field",
    "codingRequired": "yes",
    "prerequisites": "You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & AI Automation",
      "LLMOP's & Production Deployment",
      "Gen AI Specialization for Cloud & DevOps Professionals"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "AI resume screening, candidate matching, job descriptions",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Auto-generate reports from raw data",
        "tools": ""
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Real-time project tracking, timelines, budgets, risks",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Sentiment analysis of employee surveys",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "Certification from IBM in Generative AI",
      "IBM Certified AI Professional"
    ],
    "roles": [],
    "tools": [
      "Python",
      "LangChain",
      "RAG",
      "AutoGPT",
      "Hugging Face",
      "IBM Watsonx",
      "GitHub",
      "OpenAI",
      "Tableau",
      "Generative AI",
      "Agentic AI",
      "LLMOps"
    ]
  },
  "genai-software-developers": {
    "name": "Generative AI and Agentic AI For Software Developers",
    "url": "https://www.learnbay.co/artificial-intelligence/genai-software-developers",
    "category": "AI",
    "audience": "Software professionals (developers or engineers) with at least 1 year of work experience",
    "codingRequired": "yes",
    "prerequisites": "aspirants must have basic knowledge of Python, machine learning, and deep learning",
    "liveHours": "130+ live hours",
    "guidedProjects": "40+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & AI Automation",
      "LLMOPs & Production Deployment",
      "Gen AI for Software Developers"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "Resume screening / candidate matching",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Generate financial reports from raw data",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Real-time project tracking",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Sentiment analysis of employee feedback",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "IBM Certified AI Professional",
      "Certification from IBM in Generative AI"
    ],
    "roles": [],
    "tools": [
      "GitHub",
      "OpenAI",
      "Python",
      "LangChain",
      "RAG",
      "AutoGPT",
      "IBM Watsonx",
      "Hugging Face",
      "LLMOps"
    ]
  },
  "genai-agentic-ai-program": {
    "name": "Generative AI and Agentic AI Program",
    "url": "https://www.learnbay.co/genai-agentic-ai-program",
    "category": "AI",
    "audience": "Freshers eager to explore AI developments; Working professionals willing to learn & grow; Non-technical professionals using AI tools for diverse functions; Developers moving to AI-driven systems; Professionals from diverse roles (product/operations/business)",
    "codingRequired": "some",
    "prerequisites": "Course Prerequisites: You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & Automation",
      "LLMOP's & Production Deployment"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "AI recruitment tool",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Summarises insights from financial data",
        "tools": "LangChain"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Real-time project tracking tool",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Sentiment analysis of employee feedback",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "IBM Generative AI certification ('Become an IBM Certified AI Professional')",
      "Microsoft ('Earn an Industry-certified Microsoft certificate')"
    ],
    "roles": [],
    "tools": [
      "GitHub",
      "OpenAI",
      "Python",
      "LangChain",
      "RAG",
      "AutoGPT",
      "Hugging Face",
      "IBM Watsonx",
      "Tableau",
      "Agentic AI",
      "LLMs",
      "LLMOps"
    ]
  },
  "applied-ai-practitioner": {
    "name": "Applied AI Practitioner Program",
    "url": "https://www.learnbay.co/artificial-intelligence/applied-ai-practitioner-program",
    "category": "AI",
    "audience": "This program is for professionals looking to integrate AI into their daily work. Leaders & Entrepreneurs (5+ years: Managers, Founders, Product Owners); Non-Tech & Business Professionals (1+ years: Marketing, Sales, Operations, Trainers); Tech Professionals (1+ years: Developers, Data/ML, QA, Analysts)",
    "codingRequired": "no",
    "prerequisites": "*No coding experience needed",
    "liveHours": null,
    "guidedProjects": null,
    "modules": [
      "Foundations of AI Reasoning & LLM Workflows",
      "Generative & Multimodal AI for Real-World Content",
      "Agentic AI & Intelligent Automation",
      "No-Code App Development & AI Deployment",
      "AIOps, Optimization & Observability",
      "Startup Collaboration Capstone: AI CoLab Experience"
    ],
    "electives": [],
    "domains": [],
    "projects": [
      {
        "title": "Startup Collaboration Capstone: AI CoLab Experience",
        "detail": "Build real AI products, work with startups, deploy and showcase work",
        "tools": ""
      }
    ],
    "certifications": [
      "Certification from IIT Patna (via Vishlesan I-Hub Foundation, IIT Patna)",
      "Certification from IBM",
      "AI Startup Certificate"
    ],
    "roles": [
      "Managers",
      "Founders",
      "Product Owners",
      "Marketing",
      "Sales",
      "Operations",
      "Trainers",
      "Developers",
      "Data/ML",
      "QA"
    ],
    "tools": [
      "ChatGPT",
      "Claude",
      "Gemini",
      "Cohere",
      "Llama",
      "LangChain",
      "Hugging Face",
      "OpenAI API",
      "Anthropic API",
      "Together AI",
      "Make",
      "Zapier",
      "n8n",
      "Flowise",
      "Dify",
      "DALL-E",
      "Midjourney",
      "Runway",
      "Synthesia",
      "Bubble",
      "FlutterFlow",
      "Replit",
      "Cursor",
      "AWS",
      "GCP",
      "Azure",
      "DataDog",
      "Prompt engineering",
      "Tokenization",
      "Embeddings"
    ]
  },
  "forward-deployed-ai-engineer": {
    "name": "Forward Deployed Engineer Course for Working Professionals",
    "url": "https://www.learnbay.co/artificial-intelligence/forward-deployed-engineer-course",
    "category": "AI",
    "audience": "Working Professionals (page subtitle: 'Integrated with AI Co-Lab Experience and BYOP')",
    "codingRequired": "yes",
    "prerequisites": "You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "400+ live hours",
    "guidedProjects": "80+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Gen AI Foundation (No Code)",
      "Python for AI",
      "Software Engineering for FDE",
      "Foundation for AI",
      "Generative AI & LLM Engineering",
      "Advanced RAG & Enterprise AI Systems",
      "Agentic AI & Automation",
      "Cloud, Deployment, LLMOps & AIOps",
      "AI System Design & Enterprise Architecture",
      "FDE / Client Solution Engineering",
      "Elective A: FDE for Software & SaaS",
      "Elective B: FDE for Data & Analytics",
      "Elective C: FDE for Cloud & Enterprise",
      "Capstone Projects & Interview Readiness",
      "DSA & Problem Solving (Optional)"
    ],
    "electives": [
      "FDE for Software & SaaS",
      "FDE for Data & Analytics",
      "FDE for Cloud & Enterprise"
    ],
    "domains": [],
    "projects": [
      {
        "title": "Enterprise Knowledge Copilot",
        "detail": "A grounded assistant that answers policy and questions from internal documents",
        "tools": ""
      },
      {
        "title": "Client Data Agent for operations teams",
        "detail": "An agent that answers business questions by querying a database",
        "tools": ""
      },
      {
        "title": "AI Deployment Observability Dashboard",
        "detail": "Track quality, latency and token cost for a live AI system",
        "tools": ""
      },
      {
        "title": "Support Automation Agent with human approval",
        "detail": "Triage incoming tickets, draft replies and act on systems",
        "tools": ""
      }
    ],
    "certifications": [
      "Microsoft (Azure AI Fundamentals)",
      "IBM Gen-AI Certificate",
      "Project certificates from Learnbay and leading MNCs & unicorn startups"
    ],
    "roles": [
      "Forward-Deployed AI Engineer"
    ],
    "tools": [
      "Python",
      "LangChain",
      "LangGraph",
      "RAG",
      "MCP",
      "GitHub",
      "Tableau",
      "Power BI",
      "IBM Watsonx",
      "vector databases",
      "LLMs",
      "multimodal GenAI",
      "API integrations",
      "AIOps",
      "LLMOps",
      "automation workflows",
      "AI system design",
      "DSA"
    ]
  },
  "ai-engineering-master": {
    "name": "AI Engineering Master Certification Program",
    "url": "https://www.learnbay.co/ai-engineering-master-program",
    "category": "AI",
    "audience": "Not explicitly stated. Hero tagline: 'Learn to integrate GenAI into your existing software stack' / 'Build Autonomous AI Agents'",
    "codingRequired": "yes",
    "prerequisites": "You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "300+ live hours",
    "guidedProjects": "40+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & Automation",
      "AI System Architecture & Platform Engineering",
      "LLMOP's & Production Deployment"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Supply Chain",
      "Manufacturing",
      "HR",
      "Project Management"
    ],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "AI tool to screen resumes, match candidates to jobs, and draft job descriptions",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Automatically create clear financial reports from raw data like balance sheets",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Track and analyze the progress of projects in real time (timelines, budgets, risks)",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Analyze employee feedback and surveys for trends and sentiments",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "Microsoft (Project Certificate)",
      "IBM (Gen-AI Certificate)",
      "Certificates issued by Learnbay and leading MNCs & unicorn startups"
    ],
    "roles": [],
    "tools": [
      "Python",
      "LLMs",
      "RAG",
      "Agentic AI",
      "Vector Databases",
      "LangChain",
      "AutoGPT",
      "Hugging Face",
      "IBM Watsonx",
      "GitHub",
      "OpenAI",
      "Tableau",
      "MLOps",
      "CI/CD"
    ]
  },
  "sde-genai-agentic-ai": {
    "name": "SDE Master Program Generative AI and Agentic AI",
    "url": "https://www.learnbay.co/artificial-intelligence/sde-master-program-genai-agentic-ai",
    "category": "AI / Software Engineering",
    "audience": "Software developers and engineers with a minimum of 1+ years of industry experience",
    "codingRequired": "yes",
    "prerequisites": "You should have knowledge of Python, Machine Learning, & Deep Learning.",
    "liveHours": "300+ live hours",
    "guidedProjects": "40+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Advanced Generative AI",
      "Agentic AI & AI Automation",
      "LLMOP's & Production Deployment",
      "Data Structures & Algorithms",
      "System Design"
    ],
    "electives": [
      "Elective A: LLM-Powered Software Engineering & Developer Copilots",
      "Elective B: Cloud, DevOps & LLM Infrastructure Engineering",
      "Elective C: Backend Engineering for LLM Applications & RAG Microservices",
      "Elective D: Distributed Systems & Microservices for AI Applications",
      "Elective E: Multi-Agent Systems, Workflow Automation & Enterprise Orchestration",
      "Elective F: GenAI & Agentic AI for Product Managers"
    ],
    "domains": [],
    "projects": [
      {
        "title": "Smart Hiring Tool for recruitment",
        "detail": "Resume screening and candidate matching",
        "tools": "LangChain"
      },
      {
        "title": "Financial Report Generator using GenAI tools",
        "detail": "Automated financial reports",
        "tools": "LangChain, Hugging Face"
      },
      {
        "title": "Project Performance Dashboard",
        "detail": "Real-time project tracking with timeline/budget insights",
        "tools": ""
      },
      {
        "title": "Employee Feedback Insights",
        "detail": "Sentiment analysis",
        "tools": "LangChain, Hugging Face"
      }
    ],
    "certifications": [
      "Microsoft (MasterTrack Certification)",
      "IBM (Gen-AI Certificate)"
    ],
    "roles": [],
    "tools": [
      "Python",
      "GenAI",
      "Agentic AI",
      "LangChain",
      "RAG",
      "AutoGPT",
      "GitHub",
      "OpenAI",
      "Tableau",
      "IBM Watsonx",
      "Hugging Face",
      "DSA",
      "System Design",
      "DevOps",
      "Cloud",
      "Microservices"
    ]
  },
  "ai-cloud-devops-master": {
    "name": "AI Powered Cloud and DevOps Engineering Masters Certification Program",
    "url": "https://www.learnbay.co/cloud-and-devops/ai-powered-cloud-devops-masters-certification",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level IT professionals with a minimum of 1 year of work experience. Professionals such as system administrators, solution architects, support engineers, and IT experts are the most welcomed",
    "codingRequired": "some",
    "prerequisites": "Minimum of 1 year of working experience in the IT domain. 'Not an ideal match for freshers, irrespective of the domain'",
    "liveHours": "250+ live hours",
    "guidedProjects": "40+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "Microsoft Azure Proficiency (Optional)",
      "Cloud System Design & Distributed Architecture",
      "DevOps Mastery – Infrastructure & Automation",
      "DevSecOps & Cloud Security Engineering",
      "Multicloud Strategy & Architecture",
      "MLOps Engineering",
      "GenAI Essentials for Cloud & Devops"
    ],
    "electives": [
      "Cloud & DevOps for Network Professionals",
      "Cloud & DevOps for System Administrators",
      "Cloud & DevOps for IT Support and IT Operations",
      "Cloud & DevOps for Database Administrators"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Create a multistage CI/CD pipeline for deploying a microservices based application to a cloud platform like AWS, Azure, or GCP",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Design and deploy an automated cloud infrastructure setup using Terraform",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Set up a robust monitoring and logging infrastructure for realtime data analysis and alerting",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Build and deploy a serverless application using cloud functions following a DevOps workflow",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "IBM (Generative AI Certification)",
      "Microsoft",
      "Learnbay Cloud & DevOps Certification"
    ],
    "roles": [],
    "tools": [
      "Python",
      "Linux",
      "AWS",
      "Azure",
      "GCP",
      "Jenkins",
      "Docker",
      "Kubernetes",
      "Terraform",
      "Git",
      "GitHub",
      "GitHub Actions",
      "GitLab CI/CD",
      "AWS CloudFormation",
      "Azure Resource Manager",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS CloudWatch",
      "AWS Lambda",
      "Azure Functions",
      "Google Cloud Functions",
      "IBM Watsonx",
      "DevSecOps",
      "MLOps",
      "Multicloud"
    ]
  },
  "cloud-devops-network": {
    "name": "Cloud and DevOps Engineering Certification for Network Professionals",
    "url": "https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-network-professionals",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level working professionals with a minimum of 1 year of work experience in the IT domain",
    "codingRequired": "some",
    "prerequisites": "minimum of 1 year of work experience in the IT domain; 'not an ideal match for freshers'",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "DevOps Mastery – Infrastructure & Automation",
      "Microsoft Azure Proficiency (Optional)",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline for a microservices based application",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Automated cloud infrastructure setup",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Monitoring and logging infrastructure for realtime data analysis",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Serverless application using cloud functions",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate)",
      "Learnbay"
    ],
    "roles": [],
    "tools": [
      "Python",
      "Linux",
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "GitLab CI/CD",
      "Terraform",
      "AWS CloudFormation",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS CloudWatch",
      "GitHub Actions",
      "AWS Lambda",
      "VPCs",
      "ALB/NLB",
      "Route 53",
      "cloud networking architectures"
    ]
  },
  "cloud-devops-qa-testers": {
    "name": "Cloud and DevOps Certification for Software Test Engineers",
    "url": "https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-qa-and-software-test-engineers",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level QA and test professionals (Software Test Engineers, QA engineers)",
    "codingRequired": "some",
    "prerequisites": "minimum of 1 year of QA experience and basic familiarity with testing",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "DevOps Mastery – Infrastructure & Automation",
      "Microsoft Azure Proficiency (Optional)",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline integrating automated test suites with deployment to a cloud platform like AWS",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Test Infra Automation",
        "detail": "Automated test infrastructure using Terraform for cloud-based test environments",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Test Observability & Monitoring Solution",
        "detail": "Cloud monitoring and log aggregation for test environments with real-time failure detection",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Containerised Parallel Test Execution Platform",
        "detail": "Package test suites into Docker containers, deploy Selenium Grid on Kubernetes",
        "tools": "Docker, Kubernetes, Selenium Grid, GitHub Actions, AWS EC2"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate) -- 'Get directly certified from Microsoft'"
    ],
    "roles": [
      "SDET",
      "QA DevOps",
      "Cloud and DevOps QA engineering"
    ],
    "tools": [
      "Linux",
      "Python",
      "Pytest",
      "Selenium Grid",
      "Jenkins",
      "Docker",
      "Kubernetes",
      "Terraform",
      "AWS",
      "AWS EC2",
      "Azure",
      "GCP",
      "CloudWatch",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "Git",
      "GitHub",
      "GitHub Actions"
    ]
  },
  "cloud-devops-sysadmin": {
    "name": "Cloud and DevOps Engineering Certification for System Administrators",
    "url": "https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-system-administrators",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level IT professionals with a minimum of 1 year of work experience",
    "codingRequired": "some",
    "prerequisites": "minimum of 1 year of work experience; not suitable for 'freshers, irrespective of the domain'",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "DevOps Mastery – Infrastructure & Automation",
      "Microsoft Azure Proficiency (Optional)",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline for a microservices based application",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Automated cloud infrastructure setup using Terraform",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Monitoring and logging infrastructure for realtime data analysis and alerting",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Serverless application using cloud functions",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate)",
      "Learnbay"
    ],
    "roles": [],
    "tools": [
      "Linux",
      "Python",
      "AWS",
      "AWS EC2",
      "IAM",
      "Ansible",
      "Terraform",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "CI/CD",
      "GitHub",
      "Azure",
      "GCP",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS CloudWatch",
      "Serverless / Lambda",
      "MLOps"
    ]
  },
  "advanced-cloud-devops": {
    "name": "Advanced Cloud & DevOps Program",
    "url": "https://www.learnbay.co/cloud-and-devops/advanced-cloud-computing-and-devops-program",
    "category": "Cloud & DevOps",
    "audience": "for Working Professionals Across Domains",
    "codingRequired": "no",
    "prerequisites": "The cloud technology course is beginner-friendly, and IT/non-IT experts can opt for this. You can join this program with a basic knowledge of statistics/mathematics and fundamental concepts of IT.",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "Microsoft Azure Proficiency (Optional)",
      "DevOps Mastery – Infrastructure & Automation",
      "Multicloud Strategy & Architecture",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline for a microservices based application",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Automated cloud infrastructure setup using Terraform",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Monitoring and logging infrastructure for realtime data analysis",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Serverless application using cloud functions",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate) -- 'Get directly certified from Microsoft'"
    ],
    "roles": [
      "DevOps Engineer ('become a certified DevOps Engineer')"
    ],
    "tools": [
      "Python",
      "Linux",
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "GitLab CI/CD",
      "GitHub",
      "Terraform",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS RDS",
      "DynamoDB",
      "Aurora",
      "DMS",
      "Multicloud",
      "MLOps"
    ]
  },
  "cloud-devops-it-support-ops": {
    "name": "Cloud and DevOps Engineering Certification for IT Support & IT Operations",
    "url": "https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-it-support-and-it-operations",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level IT professionals with a minimum of 1 year of work experience. Professionals working as IT support and IT Ops Engineers are the most welcomed",
    "codingRequired": "some",
    "prerequisites": "minimum of 1 year of working experience in the IT domain; 'not an ideal match for freshers, irrespective of the domain'",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "DevOps Mastery – Infrastructure & Automation",
      "Microsoft Azure Proficiency (Optional)",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline for deploying microservices",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Automated cloud infrastructure using Terraform",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Robust monitoring and logging infrastructure",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Serverless application using cloud functions",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate)",
      "Learnbay"
    ],
    "roles": [
      "Cloud Operations",
      "DevOps",
      "Cloud Ops & DevOps"
    ],
    "tools": [
      "Python",
      "Linux",
      "AWS",
      "Azure",
      "GCP",
      "Jenkins",
      "GitLab CI/CD",
      "Docker",
      "Kubernetes",
      "Terraform",
      "AWS CloudFormation",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS CloudWatch",
      "Git",
      "GitHub",
      "Lambda",
      "Log Analysis",
      "Alerting & Observability"
    ]
  },
  "cloud-devops-dba": {
    "name": "Cloud and DevOps Engineering Certification for Database Administrators",
    "url": "https://www.learnbay.co/cloud-and-devops/cloud-computing-and-devops-for-database-administrators",
    "category": "Cloud & DevOps",
    "audience": "entry to mid-level IT professionals with a minimum of 1 year of work experience",
    "codingRequired": "some",
    "prerequisites": "minimum of 1 year of work experience; 'Not an ideal match for freshers. It requires a minimum of 1 year of working experience in the tech domain.'",
    "liveHours": "150+ live hours",
    "guidedProjects": "10+ guided projects",
    "modules": [
      "Cloud Basics and Linux Fundamentals",
      "Python Programming Essentials",
      "AWS Cloud Practitioner",
      "AWS Associate & Professional Solutions Architect",
      "DevOps Mastery – Infrastructure & Automation",
      "Microsoft Azure Proficiency (Optional)",
      "MLOps Engineering"
    ],
    "electives": [
      "Microsoft Azure Proficiency (Optional)"
    ],
    "domains": [],
    "projects": [
      {
        "title": "CI/CD Pipeline",
        "detail": "Multistage CI/CD pipeline for a microservices based application",
        "tools": "Jenkins, GitLab CI/CD, Docker, Kubernetes"
      },
      {
        "title": "Cloud Infrastructure Automation",
        "detail": "Automated cloud infrastructure setup using Terraform",
        "tools": "Terraform, AWS CloudFormation, Azure Resource Manager"
      },
      {
        "title": "Monitoring and Logging Solution",
        "detail": "Monitoring and logging infrastructure for realtime data analysis",
        "tools": "Prometheus, Grafana, ELK Stack, AWS CloudWatch"
      },
      {
        "title": "Serverless Application Deployment with DevOps",
        "detail": "Serverless application using cloud functions",
        "tools": "AWS Lambda, Azure Functions, Google Cloud Functions, GitHub Actions"
      }
    ],
    "certifications": [
      "Microsoft (Solution Architect Expert, Azure Fundamentals, Administrator Associate)",
      "Learnbay"
    ],
    "roles": [],
    "tools": [
      "Python",
      "Linux",
      "AWS",
      "Azure",
      "GCP",
      "Docker",
      "Kubernetes",
      "Terraform",
      "Jenkins",
      "GitLab CI/CD",
      "GitHub",
      "Prometheus",
      "Grafana",
      "ELK Stack",
      "AWS CloudWatch",
      "AWS RDS",
      "DynamoDB",
      "Aurora",
      "AWS Lambda",
      "CI/CD"
    ]
  },
  "data-science-genai-master": {
    "name": "Advanced Data Science and GenAI Master Certification Program",
    "url": "https://www.learnbay.co/datascience/data-science-and-ai-master-certification-program",
    "category": "Data Science",
    "audience": "IT and non-IT working professionals with a minimum of 1 year of experience in any domain",
    "codingRequired": "no",
    "prerequisites": "Minimum 1 year work experience in any domain. 'Also, learners with no programming skills can join this Generative AI course.'",
    "liveHours": "370+ live hours",
    "guidedProjects": "60+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Generative AI",
      "Agentic AI",
      "Statistics & Foundation of DS",
      "Advanced Data Science",
      "Deployment & MLOps",
      "Data Analytics & Visualization Tools",
      "Database Management System",
      "Big Data Analytics",
      "DSA (Optional)",
      "Project Management (Skills & Tools)"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Retail",
      "HR",
      "Manufacturing",
      "Technology",
      "Consulting"
    ],
    "projects": [],
    "certifications": [
      "IBM Course Completion Certificate",
      "Microsoft Certification",
      "Project certificates from startups",
      "GenAI Certificate",
      "2 AI Co-Lab Certificates"
    ],
    "roles": [],
    "tools": [
      "Python",
      "Statistics",
      "Machine Learning",
      "GitHub",
      "OpenAI",
      "Tableau",
      "LangChain",
      "RAG",
      "AutoGPT",
      "IBM Watsonx",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "Azure",
      "AWS",
      "Git",
      "Linux",
      "Prometheus",
      "Grafana",
      "MLOps",
      "Big Data",
      "DBMS"
    ]
  },
  "data-science-genai-program": {
    "name": "Data Science and GenAI Program (IBM Certified Data Science & GenAI Program)",
    "url": "https://www.learnbay.co/data-science-genai-program",
    "category": "Data Science",
    "audience": "Freshers eager to explore AI developments; Working professionals willing to learn & grow; Non-technical professionals using AI tools for diverse functions; Developers moving to AI-driven systems; Professionals from diverse roles (product/operations/business)",
    "codingRequired": "unknown",
    "prerequisites": "No explicit prerequisites stated (FAQ answer lists the audience groups above)",
    "liveHours": "250+ live hours",
    "guidedProjects": "30+ guided projects",
    "modules": [
      "Induction & Orientation",
      "Python for GenAI",
      "Foundation for GenAI",
      "Generative AI",
      "Agentic AI",
      "Statistics & Machine Learning",
      "Advanced Machine Learning",
      "Data Analytics & Visualization Tools",
      "Database Management System",
      "Big Data Analytics"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Healthcare",
      "Retail",
      "HR",
      "Manufacturing",
      "Technology",
      "Consulting"
    ],
    "projects": [],
    "certifications": [
      "IBM (Industry-Ready Certification / IBM Generative AI certification)",
      "IIT Patna AI Certification",
      "Project Certificate"
    ],
    "roles": [],
    "tools": [
      "Python",
      "Statistics",
      "Machine Learning",
      "Tableau",
      "GitHub",
      "OpenAI",
      "LangChain",
      "RAG",
      "AutoGPT",
      "IBM Watsonx",
      "Generative AI",
      "Agentic AI",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "Azure",
      "AWS",
      "Prometheus",
      "Grafana",
      "Git",
      "Linux",
      "Big Data",
      "DBMS"
    ]
  },
  "data-business-analytics-genai": {
    "name": "Data Analytics and Business Analytics with Generative AI",
    "url": "https://www.learnbay.co/artificial-intelligence/generative-ai-analytics-course",
    "category": "Data Analytics",
    "audience": "Early to mid-career professionals interested in Business analytics; Tech and non-tech professionals",
    "codingRequired": "no",
    "prerequisites": "'Tech and non-tech professionals with at least 1+ years of work experience from any domain ... Experts with no programming skills can also enroll'. Eligibility card also says: 'Bachelor's degree with consistent good academic' and 'Minimum 6 Month of IT/Non-IT work experience'",
    "liveHours": null,
    "guidedProjects": "100+ guided projects",
    "modules": [
      "Foundations of AI Reasoning & LLM Workflows",
      "Generative & Multimodal AI for Real-World Content",
      "Agentic AI & Intelligent Automation",
      "No-Code App Development & AI Deployment",
      "AIOps, Optimization & Observability",
      "Startup Collaboration Capstone: AI CoLab Experience",
      "Excel",
      "SQL (Structured Query Language)",
      "PowerBI",
      "Tableau"
    ],
    "electives": [],
    "domains": [
      "BFSI",
      "Retail",
      "Healthcare",
      "HR",
      "Marketing"
    ],
    "projects": [
      {
        "title": "Sales Performance Optimization",
        "detail": "Analyze sales data to uncover patterns and forecast performance",
        "tools": ""
      },
      {
        "title": "Customer Segmentation for Personalized Marketing",
        "detail": "Segment audiences for targeted campaigns",
        "tools": ""
      },
      {
        "title": "Supply Chain Optimization with Big Data",
        "detail": "Reduce bottlenecks in supply chain efficiency",
        "tools": ""
      },
      {
        "title": "Financial Risk Prediction and Mitigation",
        "detail": "Assess financial risks using predictive analytics",
        "tools": ""
      },
      {
        "title": "Predictive Analytics for Customer Churn",
        "detail": "Predict churn using customer interaction history",
        "tools": ""
      },
      {
        "title": "HR Analytics for Employee Retention",
        "detail": "Predict turnover and develop engagement strategies",
        "tools": ""
      }
    ],
    "certifications": [
      "IBM Course Completion Certificate",
      "Project Certification from IBM",
      "Gen-AI Certificate"
    ],
    "roles": [
      "AI Product Manager",
      "Business Analyst",
      "BI Engineer",
      "Sr. Data Scientist",
      "ML Engineer",
      "AI Engineer",
      "BI Developer",
      "Sr. Data Analyst",
      "Database Admin"
    ],
    "tools": [
      "Excel",
      "SQL",
      "Power BI",
      "Tableau",
      "Prompt engineering",
      "RAG",
      "Tokenization",
      "Embeddings",
      "Chain-of-thought reasoning",
      "Agentic AI",
      "Multimodal AI",
      "No-code app development"
    ]
  },
  "ms-cs-data-science-ai": {
    "name": "Master of Science in Computer Science with a Specialisation Certificate in Data Science and AI",
    "url": "https://www.learnbay.co/datascience/data-science-and-ai-masters-in-cs",
    "category": "Degree (Data Science & AI)",
    "audience": "anyone with a bachelor's degree in any domain ... Working professionals with a good academic record and basic knowledge of statistics/mathematics",
    "codingRequired": "unknown",
    "prerequisites": "Bachelor's degree in any domain; basic knowledge of statistics/mathematics (from FAQ). No structured prerequisites field found.",
    "liveHours": null,
    "guidedProjects": null,
    "modules": [
      "Foundation Track",
      "Statistics & Machine Learning",
      "S1: Data Analytics & Visualization",
      "S1: Deep Learning & Applied Analytics",
      "S1: Industry-Specific DA & Professional Development",
      "S2: Deep Learning & Advanced Data Analysis",
      "S2: Deployment & Gen-AI",
      "S2: Comprehensive Data Structures",
      "S2: Industry-Specific DA & Professional Development"
    ],
    "electives": [
      "Specialization 1: Data Science and Analytics",
      "Specialization 2: Artificial Intelligence & ML"
    ],
    "domains": [],
    "projects": [
      {
        "title": "JPMorgan",
        "detail": "Classification techniques for digital transformation of banking",
        "tools": ""
      },
      {
        "title": "Netflix",
        "detail": "Content recommendation model based on regional viewer categorization",
        "tools": ""
      },
      {
        "title": "Saudi Aramco",
        "detail": "Logging while drilling (LWD) technique",
        "tools": ""
      },
      {
        "title": "IBM",
        "detail": "Career progression planning of employees with workforce defections & efficiency",
        "tools": ""
      }
    ],
    "certifications": [
      "Degree via Woolf (EU) -- 'ECTS accreditation recognized across more than 60 countries. Equivalent to a Master's Degree in the US'",
      "IBM & Microsoft (dual certifications)"
    ],
    "roles": [
      "Sr. Data Scientist",
      "Sr. Data Analyst",
      "ML Engineer",
      "Data Scientist",
      "Data Engineer",
      "AI Research Scientist",
      "Business Intelligence Analyst",
      "MLOps Engineer",
      "Product Analytics",
      "Data Analyst"
    ],
    "tools": [
      "Statistics",
      "Machine Learning",
      "Deep Learning",
      "Data Analytics & Visualization",
      "Gen-AI",
      "Deployment",
      "Data Structures"
    ]
  }
}
