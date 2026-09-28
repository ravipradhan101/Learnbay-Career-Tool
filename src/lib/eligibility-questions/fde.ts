import type { BankItem } from './types'

// Forward Deployed Engineering (FDE): 50 questions. First option is always the correct one (options are shuffled per learner).
export const QUESTIONS: BankItem[] = [
  // Aptitude (12): verbal and logical reasoning, no numbers
  ['Aptitude', 'Key is to lock as password is to ?', ['Account', 'Keyboard', 'Printer', 'Monitor']],
  ['Aptitude', 'Doctor is to patient as consultant is to ?', ['Client', 'Hospital', 'Invoice', 'Office']],
  ['Aptitude', 'Prompt is to input as response is to ?', ['Output', 'Keyboard', 'Password', 'Folder']],
  ['Aptitude', 'Which word is the odd one out: Python, Java, Excel, Go?', ['Excel', 'Python', 'Java', 'Go']],
  ['Aptitude', 'Which word is the odd one out: GET, POST, DELETE, BROWSE?', ['BROWSE', 'GET', 'POST', 'DELETE']],
  ['Aptitude', 'All APIs have endpoints. This service is an API. What must be true?', ['It has endpoints', 'It has no endpoints', 'It is a database', 'It is always slow']],
  ['Aptitude', 'All engineers joined the call. Priya is an engineer. What follows?', ['Priya joined the call', 'Priya led the call', 'Priya missed the call', 'Only Priya joined']],
  ['Aptitude', 'Every release is tested first. Build X was released. What must be true?', ['Build X was tested', 'Build X has no bugs', 'Build X was never tested', 'Build X was released late']],
  ['Aptitude', 'Complete the sequence: Plan, Build, Test, ?', ['Deploy', 'Idea', 'Budget', 'Hire']],
  ['Aptitude', 'What should an FDE usually do first on a new client project?', ['Understand the client’s problem', 'Write production code immediately', 'Pick a cloud vendor', 'Send the final invoice']],
  ['Aptitude', 'An API key was leaked publicly. What is the sensible next step?', ['Revoke and replace the key', 'Post it on social media', 'Wait quietly and see what happens', 'Share it with more teams']],
  ['Aptitude', 'A client requests a feature you do not fully understand. Best response?', ['Ask clarifying questions', 'Build your best guess quickly', 'Ignore the request', 'Say it is impossible']],

  // Full form (12)
  ['Full form', 'What is the full form of API?', ['Application Programming Interface', 'Advanced Program Integration', 'Automated Process Interface', 'Application Process Integration']],
  ['Full form', 'What is the full form of JSON?', ['JavaScript Object Notation', 'Java Standard Object Network', 'JavaScript Online Notation', 'Joint System Object Name']],
  ['Full form', 'What is the full form of LLM?', ['Large Language Model', 'Linked Logic Machine', 'Large Learning Memory', 'Low Latency Model']],
  ['Full form', 'What is the full form of RAG in AI?', ['Retrieval-Augmented Generation', 'Random Answer Generator', 'Retrieval And Grouping Algorithm', 'Rapid AI Growth']],
  ['Full form', 'What is the full form of HTTP?', ['Hypertext Transfer Protocol', 'High Transfer Text Protocol', 'Hyperlink Text Transport Process', 'Host Transfer Tracking Protocol']],
  ['Full form', 'What is the full form of REST in web APIs?', ['Representational State Transfer', 'Remote Execution Service Tool', 'Rapid Endpoint Service Transfer', 'Resource State Tracking']],
  ['Full form', 'What is the full form of SQL?', ['Structured Query Language', 'Simple Query Logic', 'Standard Question Language', 'Sequential Query Layer']],
  ['Full form', 'What is the full form of SDK?', ['Software Development Kit', 'System Design Key', 'Software Deployment Kernel', 'Secure Data Kit']],
  ['Full form', 'What is the full form of CI/CD?', ['Continuous Integration, Continuous Delivery', 'Code Inspection, Code Deployment', 'Central Integration, Central Delivery', 'Continuous Input, Continuous Data']],
  ['Full form', 'What is the full form of SaaS?', ['Software as a Service', 'System as a Server', 'Storage as a Solution', 'Security as a Standard']],
  ['Full form', 'What is the full form of URL?', ['Uniform Resource Locator', 'Universal Record Link', 'Unified Routing Link', 'User Resource Library']],
  ['Full form', 'In data security, what is the full form of PII?', ['Personally Identifiable Information', 'Private Internet Identity', 'Protected Internal Index', 'Public Information Integration Interface']],

  // Concept (14)
  ['Concept', 'What does a large language model mainly do?', ['Generates and understands text', 'Stores files on disk', 'Speeds up the internet connection', 'Designs computer chips']],
  ['Concept', 'What is the main idea behind RAG?', ['Answering using retrieved documents', 'Training a model from scratch', 'Compressing images for cheaper storage', 'Encrypting emails between teams']],
  ['Concept', 'What is an API endpoint?', ['A URL that accepts requests', 'A type of database table', 'A kind of programming language', 'A cloud billing plan']],
  ['Concept', 'What is JSON commonly used for?', ['Exchanging data between systems', 'Designing company logos and banners', 'Editing marketing videos', 'Cooling server racks']],
  ['Concept', 'What does an HTTP 404 error usually mean?', ['Requested resource was not found', 'Server is fully overloaded', 'Request succeeded normally', 'Request is still being processed']],
  ['Concept', 'What is a prompt when working with an LLM?', ['Input text given to the model', 'The model’s training hardware', 'A database backup file', 'The model’s license key']],
  ['Concept', 'What is an LLM hallucination?', ['A confident but false answer', 'A slow model response', 'A server hardware failure', 'An expired or revoked API key']],
  ['Concept', 'What is a proof of concept?', ['A small early working demo', 'A signed legal contract', 'A final production release', 'A detailed billing report']],
  ['Concept', 'What is a staging environment?', ['A test copy before production', 'The live customer-facing system', 'A developer’s personal laptop', 'An archive of old invoices']],
  ['Concept', 'What does deploying an application mean?', ['Making it live for users', 'Deleting its old code', 'Writing its first requirement', 'Designing its logo']],
  ['Concept', 'In AI, what is an embedding?', ['A vector that represents meaning', 'A password stored in code', 'A type of firewall rule', 'A backup of a database']],
  ['Concept', 'Why should API keys be kept out of public code?', ['Others could misuse them', 'They slow the code down', 'They break code formatting', 'They make files larger']],
  ['Concept', 'What is the main role of a Forward Deployed Engineer?', ['Build solutions directly with clients', 'Manage office hardware inventory', 'Write the company’s ad campaigns', 'Process monthly employee payroll records']],
  ['Concept', 'What does authentication check?', ['Who the user is', 'How fast pages load', 'Where logs are stored', 'Which language text uses']],

  // Tools (12)
  ['Tools', 'What is Postman mainly used for?', ['Testing and exploring APIs', 'Sending physical postal mail', 'Editing large spreadsheets', 'Designing presentation slides']],
  ['Tools', 'What is Git used for?', ['Tracking changes in code', 'Hosting video calls', 'Creating spreadsheet charts', 'Monitoring CPU temperature']],
  ['Tools', 'What does Docker help developers do?', ['Package apps into containers', 'Write client emails faster', 'Draw system architecture diagrams', 'Track sales leads']],
  ['Tools', 'What is FastAPI mainly used for?', ['Building web APIs in Python', 'Editing images in browsers', 'Speeding up home Wi-Fi', 'Backing up contacts from phones']],
  ['Tools', 'Which tool is commonly used to track tasks and bugs?', ['Jira', 'Docker', 'Photoshop', 'Pandas']],
  ['Tools', 'Which of these lets your code call a hosted LLM?', ['OpenAI API', 'Microsoft Paint', 'Google Maps', 'Adobe Reader']],
  ['Tools', 'What is LangChain commonly used for?', ['Building apps around LLMs', 'Managing blockchain wallets', 'Designing website fonts', 'Monitoring network cables']],
  ['Tools', 'Which tool is a relational database queried with SQL?', ['PostgreSQL', 'Figma', 'Canva', 'Slack']],
  ['Tools', 'What are logging tools mainly used for in production?', ['Recording events to debug issues', 'Designing new app screens', 'Writing client proposals', 'Speeding up how code compiles']],
  ['Tools', 'Which cloud platform is offered by Amazon?', ['AWS', 'Azure', 'Google Cloud', 'Heroku']],
  ['Tools', 'What is Kubernetes mainly used for?', ['Managing containers at scale', 'Writing product documentation', 'Designing marketing banners', 'Editing audio podcasts']],
  ['Tools', 'Which tool is a vector database often used in RAG apps?', ['Pinecone', 'Photoshop', 'Trello', 'WordPress']],
]
