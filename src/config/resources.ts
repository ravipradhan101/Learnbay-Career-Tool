// Free learning resources the AI may recommend. Every URL was checked to load (24 Sep 2026).
// The AI only picks ids from this list, so it can never invent a link.

export type Resource = {
  id: string
  title: string
  provider: string
  url: string
  type: 'Tutorial' | 'Course' | 'Documentation' | 'Guide'
  topics: string[]
}

export const RESOURCES: Resource[] = [
  { id: 'python-tutorial', title: 'The Python Tutorial', provider: 'Python.org', url: 'https://docs.python.org/3/tutorial/', type: 'Tutorial', topics: ['Python'] },
  { id: 'sqlbolt', title: 'SQLBolt interactive SQL lessons', provider: 'SQLBolt', url: 'https://sqlbolt.com/', type: 'Tutorial', topics: ['SQL'] },
  { id: 'postgres-tutorial', title: 'PostgreSQL Tutorial', provider: 'PostgreSQL', url: 'https://www.postgresql.org/docs/current/tutorial.html', type: 'Documentation', topics: ['SQL', 'Databases'] },
  { id: 'pandas-start', title: 'Getting started with pandas', provider: 'pandas', url: 'https://pandas.pydata.org/docs/getting_started/index.html', type: 'Documentation', topics: ['Python', 'Data analysis'] },
  { id: 'google-ml-crash-course', title: 'Machine Learning Crash Course', provider: 'Google for Developers', url: 'https://developers.google.com/machine-learning/crash-course', type: 'Course', topics: ['Machine Learning'] },
  { id: 'kaggle-learn', title: 'Kaggle Learn micro-courses', provider: 'Kaggle', url: 'https://www.kaggle.com/learn', type: 'Course', topics: ['Python', 'Machine Learning', 'Data analysis'] },
  { id: 'sklearn-guide', title: 'scikit-learn User Guide', provider: 'scikit-learn', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'Documentation', topics: ['Machine Learning'] },
  { id: 'fastai', title: 'Practical Deep Learning for Coders', provider: 'fast.ai', url: 'https://course.fast.ai/', type: 'Course', topics: ['Deep Learning'] },
  { id: 'pytorch-tutorials', title: 'PyTorch Tutorials', provider: 'PyTorch', url: 'https://pytorch.org/tutorials/', type: 'Tutorial', topics: ['Deep Learning'] },
  { id: 'hf-llm-course', title: 'LLM Course', provider: 'Hugging Face', url: 'https://huggingface.co/learn/llm-course', type: 'Course', topics: ['GenAI / LLMs'] },
  { id: 'hf-agents-course', title: 'AI Agents Course', provider: 'Hugging Face', url: 'https://huggingface.co/learn/agents-course', type: 'Course', topics: ['Agentic AI'] },
  { id: 'ms-genai-beginners', title: 'Generative AI for Beginners', provider: 'Microsoft (GitHub)', url: 'https://github.com/microsoft/generative-ai-for-beginners', type: 'Course', topics: ['GenAI / LLMs'] },
  { id: 'ms-agents-beginners', title: 'AI Agents for Beginners', provider: 'Microsoft (GitHub)', url: 'https://github.com/microsoft/ai-agents-for-beginners', type: 'Course', topics: ['Agentic AI'] },
  { id: 'dlai-short-courses', title: 'Short courses on GenAI', provider: 'DeepLearning.AI', url: 'https://www.deeplearning.ai/short-courses/', type: 'Course', topics: ['GenAI / LLMs', 'Agentic AI', 'RAG'] },
  { id: 'gemini-prompting', title: 'Prompt design strategies', provider: 'Google AI for Developers', url: 'https://ai.google.dev/gemini-api/docs/prompting-strategies', type: 'Guide', topics: ['Prompt engineering'] },
  { id: 'prompting-guide', title: 'Prompt Engineering Guide', provider: 'promptingguide.ai', url: 'https://www.promptingguide.ai/', type: 'Guide', topics: ['Prompt engineering'] },
  { id: 'langchain-docs', title: 'LangChain documentation', provider: 'LangChain', url: 'https://docs.langchain.com/', type: 'Documentation', topics: ['RAG', 'Agentic AI'] },
  { id: 'llamaindex-docs', title: 'LlamaIndex documentation', provider: 'LlamaIndex', url: 'https://docs.llamaindex.ai/', type: 'Documentation', topics: ['RAG'] },
  { id: 'ragas-docs', title: 'Ragas: evaluating LLM applications', provider: 'Ragas', url: 'https://docs.ragas.io/', type: 'Documentation', topics: ['LLM evaluation', 'RAG', 'Testing'] },
  { id: 'owasp-genai', title: 'OWASP GenAI Security Project', provider: 'OWASP', url: 'https://genai.owasp.org/', type: 'Guide', topics: ['AI security', 'Testing'] },
  { id: 'playwright', title: 'Playwright getting started', provider: 'Playwright', url: 'https://playwright.dev/docs/intro', type: 'Documentation', topics: ['Testing', 'Automation'] },
  { id: 'fastapi-tutorial', title: 'FastAPI Tutorial', provider: 'FastAPI', url: 'https://fastapi.tiangolo.com/tutorial/', type: 'Tutorial', topics: ['API Development', 'Python'] },
  { id: 'streamlit-docs', title: 'Streamlit documentation', provider: 'Streamlit', url: 'https://docs.streamlit.io/', type: 'Documentation', topics: ['Python', 'AI apps'] },
  { id: 'made-with-ml', title: 'Made With ML (MLOps)', provider: 'Made With ML', url: 'https://madewithml.com/', type: 'Course', topics: ['MLOps', 'Deployment'] },
  { id: 'mlflow-docs', title: 'MLflow documentation', provider: 'MLflow', url: 'https://mlflow.org/docs/latest/index.html', type: 'Documentation', topics: ['MLOps', 'LLMOps'] },
  { id: 'docker-start', title: 'Docker: Get started', provider: 'Docker', url: 'https://docs.docker.com/get-started/', type: 'Tutorial', topics: ['Docker', 'Deployment'] },
  { id: 'k8s-basics', title: 'Kubernetes Basics', provider: 'Kubernetes', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', type: 'Tutorial', topics: ['Kubernetes', 'Deployment'] },
  { id: 'aws-skill-builder', title: 'AWS Skill Builder', provider: 'Amazon Web Services', url: 'https://skillbuilder.aws/', type: 'Course', topics: ['Cloud (AWS/Azure)'] },
  { id: 'ms-learn-azure', title: 'Azure training', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/azure/', type: 'Course', topics: ['Cloud (AWS/Azure)'] },
  { id: 'git-book', title: 'Pro Git book', provider: 'git-scm.com', url: 'https://git-scm.com/book/en/v2', type: 'Guide', topics: ['Git', 'Portfolio'] },
]

export function getResources(ids: string[]): Resource[] {
  return ids.map((id) => RESOURCES.find((r) => r.id === id)).filter((r): r is Resource => Boolean(r))
}
