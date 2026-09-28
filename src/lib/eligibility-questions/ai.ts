import type { BankItem } from './types'

// AI & GenAI: 50 questions. First option is always the correct one (options are shuffled per learner).
export const QUESTIONS: BankItem[] = [
  // Aptitude (12): verbal and logical reasoning, no numbers
  ['Aptitude', 'Prompt is to response as question is to what?', ['Answer', 'Keyboard', 'Server', 'Dataset']],
  ['Aptitude', 'Which is the odd one out: Claude, Gemini, Llama, Excel?', ['Excel', 'Claude', 'Gemini', 'Llama']],
  ['Aptitude', 'All chatbots are software. Aria is a chatbot. So Aria is what?', ['Software', 'Hardware', 'A human', 'A dataset']],
  ['Aptitude', 'Which step comes right before training a machine learning model?', ['Preparing the data', 'Deploying the model', 'Monitoring live usage', 'Collecting user feedback']],
  ['Aptitude', 'An AI trained on biased data will most likely give what?', ['Biased outputs', 'Faster outputs', 'Shorter outputs', 'Encrypted outputs']],
  ['Aptitude', 'A chatbot states an unverified fact confidently. What should you do first?', ['Check a trusted source', 'Share it with everyone', 'Paste it into reports', 'Assume it is correct']],
  ['Aptitude', 'Which word can be formed from the letters T, A, A, D?', ['Data', 'Tide', 'Dart', 'Toad']],
  ['Aptitude', 'Teacher is to student as training data is to what?', ['Model', 'Monitor', 'Cable', 'Browser']],
  ['Aptitude', 'Some AI tools are free. Which statement must be true?', ['At least one is free', 'Every AI tool costs nothing', 'No AI tool needs any payment', 'All free tools are AI tools']],
  ['Aptitude', 'Which is the odd one out: summarise, translate, draft, unplug?', ['Unplug', 'Summarise', 'Translate', 'Draft']],
  ['Aptitude', 'Pixel is to image as token is to what?', ['Text', 'Sound', 'Colour', 'Server']],
  ['Aptitude', 'You give an AI a vague prompt. What is the likely result?', ['A generic answer', 'A faster reply time', 'A system crash', 'A locked account']],

  // Full form (12)
  ['Full form', 'What does LLM stand for?', ['Large Language Model', 'Linked Logic Machine', 'Low Latency Memory', 'Learning Layer Module']],
  ['Full form', 'What does NLP stand for in AI?', ['Natural Language Processing', 'Neural Logic Programming', 'Network Layer Protocol', 'Numerical Linguistic Programming']],
  ['Full form', 'What does GPT stand for?', ['Generative Pre-trained Transformer', 'General Purpose Technology', 'Guided Prompt Tool', 'Graphical Pre-trained Transformation']],
  ['Full form', 'What does RAG stand for in GenAI?', ['Retrieval-Augmented Generation', 'Random Answer Generator', 'Reasoning-Assisted Generalisation', 'Recursive Attention Graph']],
  ['Full form', 'What does API stand for?', ['Application Programming Interface', 'Automated Program Integration', 'Advanced Processing Input', 'Automated Programming Instructions']],
  ['Full form', 'What does GPU stand for?', ['Graphics Processing Unit', 'General Processing Utility', 'Global Power Unit', 'Generative Program Unit']],
  ['Full form', 'What does CNN stand for in deep learning?', ['Convolutional Neural Network', 'Connected Node Network', 'Central Neural Node', 'Complex Numerical Neural Network']],
  ['Full form', 'What does GAN stand for in AI?', ['Generative Adversarial Network', 'General Algorithm Network', 'Guided Attention Neural Network', 'Graph Analysis Network']],
  ['Full form', 'What does AGI stand for?', ['Artificial General Intelligence', 'Automated Generative Intelligence', 'Advanced Generative Index', 'Applied Global Intelligence']],
  ['Full form', 'What does RLHF stand for in LLM training?', ['Reinforcement Learning from Human Feedback', 'Rapid Learning with High Frequency', 'Recursive Logic for Human Functions', 'Recursive Language Learning from Human Files']],
  ['Full form', 'What does OCR stand for?', ['Optical Character Recognition', 'Online Content Retrieval', 'Object Classification Routine', 'Open Code Repository']],
  ['Full form', 'What does ML stand for in tech?', ['Machine Learning', 'Model Logic', 'Memory Layer', 'Mathematical Logic']],

  // Concept (14)
  ['Concept', 'What does a large language model mainly do?', ['Generates and understands text', 'Stores files on disk', 'Speeds up the internet', 'Designs new computer processor chips']],
  ['Concept', 'What is a prompt in generative AI?', ['An instruction given to AI', 'A type of graphics card', 'A log of training errors', 'A backup copy of a database']],
  ['Concept', 'What is an AI hallucination?', ['Confident but false output', 'A hardware overheating issue', 'A slow network response', 'A corrupted training file']],
  ['Concept', 'What is a token in an LLM?', ['A small chunk of text', 'A login password', 'A payment receipt', 'A server network address']],
  ['Concept', 'What are embeddings mainly used for?', ['Representing meaning as vectors', 'Compressing video files', 'Encrypting stored user passwords', 'Rendering game graphics']],
  ['Concept', 'In RAG, what does the model receive before answering?', ['Relevant retrieved information', 'A faster graphics processing unit', 'A new password', 'Extra screen space']],
  ['Concept', 'What is an AI agent?', ['AI that plans and acts', 'A human sales representative', 'A cloud storage subscription', 'A browser security plugin']],
  ['Concept', 'What is fine-tuning a model?', ['Further training on specific data', 'Adjusting the monitor screen brightness', 'Deleting old model files', 'Upgrading computer memory']],
  ['Concept', 'What does the temperature setting control in an LLM?', ['Randomness of the output', 'Physical heat of the server', 'Duration of training', 'Speed of the internet']],
  ['Concept', 'What is the context window of an LLM?', ['Text it can process at once', 'The chat application screen size', 'Time taken to train it', 'List of its active users']],
  ['Concept', 'What is the main risk of pasting confidential data into public chatbots?', ['Data privacy leaks', 'Slower typing speed', 'Lower screen resolution', 'Higher electricity bills']],
  ['Concept', 'What is generative AI?', ['AI that creates new content', 'AI that repairs hardware faults', 'A tool for backing up files', 'A network for faster downloads']],
  ['Concept', 'What is prompt engineering?', ['Crafting clear inputs for AI', 'Building physical AI robots', 'Repairing computer hardware parts', 'Laying network cables']],
  ['Concept', 'What does supervised learning use to train models?', ['Labelled examples', 'Unlabelled random noise', 'Printer settings', 'Password lists']],

  // Tools (12)
  ['Tools', 'What is ChatGPT mainly used for?', ['Chatting and generating text', 'Editing raw photos', 'Hosting web videos', 'Managing company payroll records']],
  ['Tools', 'What is Hugging Face best known for?', ['Sharing open-source AI models', 'Selling gaming laptops', 'Hosting music playlists and podcasts', 'Designing mobile games']],
  ['Tools', 'What is LangChain used for?', ['Building LLM-powered applications', 'Tracking blockchain crypto transactions', 'Designing company logos', 'Editing podcast audio']],
  ['Tools', 'What is PyTorch mainly used for?', ['Building deep learning models', 'Writing office documents', 'Managing email marketing campaigns', 'Designing website layouts']],
  ['Tools', 'Which of these is a machine learning framework?', ['TensorFlow', 'WordPress', 'Photoshop', 'Microsoft Excel']],
  ['Tools', 'What is Jupyter Notebook commonly used for?', ['Interactive coding and analysis', 'Sending bulk emails', 'Video conferencing calls', 'Storing and sharing company passwords']],
  ['Tools', 'Which of these is a vector database?', ['Pinecone', 'Photoshop', 'Slack', 'Trello']],
  ['Tools', 'Which tool is known for generating images from text prompts?', ['Midjourney', 'Excel', 'Google Maps', 'Zoom']],
  ['Tools', 'What is GitHub Copilot mainly used for?', ['Suggesting code while programming', 'Booking airline tickets and hotels', 'Hosting online video meetings', 'Designing marketing posters']],
  ['Tools', 'Which Python library is popular for working with data tables?', ['Pandas', 'Canva', 'Trello', 'Dropbox']],
  ['Tools', 'What is scikit-learn mainly used for?', ['Classical machine learning', 'Photo retouching', 'Hosting business websites online', 'Team messaging']],
  ['Tools', 'What does Google Colab provide?', ['Cloud-based Python notebooks', 'Online video editing and effects', 'Team chat messaging', 'Website domain hosting']],
]
