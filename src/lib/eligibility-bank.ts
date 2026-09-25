// Eligibility test question bank. SERVER ONLY: answers must never be sent to the browser.
// Each test = 4 general aptitude questions + 6 questions for the learner's chosen program area.
// Deliberately easy-to-moderate: it checks readiness and basic awareness, not expertise.
// In every question the FIRST option is the correct one; options are shuffled per learner before display.

export type Track = 'aptitude' | 'ai' | 'cloud-devops' | 'fde' | 'data-science' | 'analytics'
export type BankQuestion = { id: string; track: Track; text: string; options: [string, string, string, string] }

const q = (id: string, track: Track, text: string, options: [string, string, string, string]): BankQuestion => ({ id, track, text, options })

export const BANK: BankQuestion[] = [
  // ---------- General aptitude ----------
  q('apt-01', 'aptitude', 'A course costs ₹40,000. With a 15% discount, how much do you pay?', ['₹34,000', '₹36,000', '₹35,000', '₹30,000']),
  q('apt-02', 'aptitude', 'What comes next: 2, 4, 8, 16, …?', ['32', '24', '30', '36']),
  q('apt-03', 'aptitude', '3 people finish a task in 6 days. Working at the same pace, how long would 6 people take?', ['3 days', '12 days', '6 days', '2 days']),
  q('apt-04', 'aptitude', 'What is the average of 10, 20 and 30?', ['20', '15', '25', '60']),
  q('apt-05', 'aptitude', 'A value goes up from 50 to 60. What is the percentage increase?', ['20%', '10%', '16.7%', '12%']),
  q('apt-06', 'aptitude', 'All analysts in a team use Excel. Riya is an analyst in that team. Which statement must be true?', ['Riya uses Excel', 'Riya uses Python', 'Everyone who uses Excel is an analyst', 'None of these']),
  q('apt-07', 'aptitude', 'Which number is the odd one out: 3, 5, 7, 9, 11?', ['9', '3', '7', '11']),
  q('apt-08', 'aptitude', 'You save ₹2,000 every month. How much will you have saved after 1.5 years?', ['₹36,000', '₹30,000', '₹24,000', '₹18,000']),
  q('apt-09', 'aptitude', 'A meeting starts at 10:45 and lasts 95 minutes. When does it end?', ['12:20', '12:10', '12:30', '11:40']),
  q('apt-10', 'aptitude', 'In a team of 40 people, 25% work remotely. How many work from the office?', ['30', '10', '25', '35']),
  q('apt-11', 'aptitude', 'If CODE is written as DPEF, how is DATA written?', ['EBUB', 'EBTB', 'DBUB', 'EAUA']),
  q('apt-12', 'aptitude', 'Which of these is the largest?', ['3/5', '0.5', '55%', '0.45']),

  // ---------- AI & GenAI ----------
  q('ai-01', 'ai', 'What does "LLM" stand for?', ['Large Language Model', 'Linear Learning Method', 'Logical Language Machine', 'Long Learning Memory']),
  q('ai-02', 'ai', 'Which of these is a typical use of generative AI?', ['Drafting an email from a short prompt', 'Storing files on a hard disk', 'Speeding up a network cable', 'Sorting a spreadsheet column']),
  q('ai-03', 'ai', 'In machine learning, "training data" is:', ['Examples the model learns patterns from', 'The final report shown to users', 'The hardware the model runs on', 'A list of software licences']),
  q('ai-04', 'ai', 'When using a ChatGPT-style tool, a "prompt" is:', ['The instruction or question you give the model', "The model's source code", 'A billing plan', 'A type of graphics card']),
  q('ai-05', 'ai', 'RAG (Retrieval-Augmented Generation) mainly helps an AI model to:', ['Answer using relevant documents it looks up', 'Run without electricity', 'Draw images faster', 'Work without any data at all']),
  q('ai-06', 'ai', 'An AI "agent" is best described as a system that:', ['Plans steps and uses tools to reach a goal', 'Only stores passwords', 'Is a human support executive', 'Compresses video files']),
  q('ai-07', 'ai', 'When an AI model confidently states something false, it is called:', ['Hallucination', 'Compilation', 'Encryption', 'Caching']),
  q('ai-08', 'ai', 'Which programming language is most widely used in AI work?', ['Python', 'HTML', 'CSS', 'Markdown']),
  q('ai-09', 'ai', 'Sorting emails into "spam" and "not spam" is an example of:', ['Classification', 'Clustering', 'Encryption', 'Data entry']),
  q('ai-10', 'ai', 'Why should you review AI-generated output before using it at work?', ['It can contain errors or outdated information', 'It is always illegal to use', 'It deletes your files', 'It only works offline']),

  // ---------- Cloud & DevOps ----------
  q('cd-01', 'cloud-devops', 'Cloud computing mainly means:', ['Using computing resources over the internet, on demand', 'Storing data only on a USB drive', 'Weather-forecasting software', 'A faster keyboard']),
  q('cd-02', 'cloud-devops', 'Which of these is a major cloud provider?', ['AWS', 'Photoshop', 'Tally', 'Zoom']),
  q('cd-03', 'cloud-devops', 'In DevOps, CI/CD stands for:', ['Continuous Integration / Continuous Delivery', 'Central Index / Central Database', 'Code Inspection / Code Deletion', 'Cloud Instance / Cloud Disk']),
  q('cd-04', 'cloud-devops', 'Git helps a team to:', ['Track and manage changes to code', 'Design logos', 'Send invoices', 'Monitor room temperature']),
  q('cd-05', 'cloud-devops', 'A container (for example, Docker) packages:', ['An application with everything it needs to run', 'Only database backups', 'Physical servers for shipping', 'Email attachments']),
  q('cd-06', 'cloud-devops', '"Scaling out" an application usually means:', ['Adding more servers or instances to share the load', 'Deleting old logs', 'Reducing the number of users', 'Changing the logo']),
  q('cd-07', 'cloud-devops', 'The main benefit of automating deployments is:', ['Faster, repeatable releases with fewer manual errors', 'No need for testing any more', 'Longer code', 'No outages ever again']),
  q('cd-08', 'cloud-devops', 'Infrastructure as Code (IaC) means:', ['Defining servers and networks in configuration files', 'Writing code on paper', 'Hiring more IT staff', 'Buying hardware in bulk']),
  q('cd-09', 'cloud-devops', 'Monitoring tools in DevOps are used to:', ['Watch system health and alert on problems', 'Write marketing copy', 'Design user interfaces', 'Calculate salaries']),
  q('cd-10', 'cloud-devops', 'Kubernetes is mainly used to:', ['Run and manage containers at scale', 'Edit spreadsheets', 'Create PDFs', 'Replace a firewall']),

  // ---------- Forward Deployed Engineering ----------
  q('fde-01', 'fde', 'A Forward Deployed Engineer mainly:', ['Builds and adapts technical solutions directly with customers', 'Writes internal HR policies', 'Manages office supplies', 'Designs print advertisements']),
  q('fde-02', 'fde', 'Before building a solution for a client, the first step should be to:', ["Understand the client's problem and goals", 'Pick the most expensive tool', 'Start coding immediately', 'Send the invoice']),
  q('fde-03', 'fde', 'An API allows:', ['Two software systems to communicate', 'A printer to print faster', 'Users to reset their monitor', 'Emails to be encrypted by hand']),
  q('fde-04', 'fde', 'A "prototype" is:', ['An early working version to test an idea quickly', 'The final signed contract', 'A security certificate', 'A list of employees']),
  q('fde-05', 'fde', "A common way to connect an LLM to a company's own documents is:", ['Retrieval-Augmented Generation (RAG)', 'Reinstalling the operating system', 'Printing the documents', 'Emailing the documents to the model vendor']),
  q('fde-06', 'fde', "When a client's requirement is unclear, you should:", ['Ask clarifying questions and confirm with examples', 'Guess and deliver quickly', 'Ignore that part', 'Cancel the project']),
  q('fde-07', 'fde', 'JSON is commonly used to:', ['Exchange structured data between systems', 'Edit photos', 'Compress video', 'Draw charts by hand']),
  q('fde-08', 'fde', 'Deploying an application means:', ['Making it available for users in a real environment', 'Deleting its source code', 'Writing its user manual', 'Renaming its files']),
  q('fde-09', 'fde', 'Which skill matters most when explaining a technical solution to a business client?', ['Clear, simple communication', 'Using as much jargon as possible', 'Avoiding questions', 'Speaking only in code']),
  q('fde-10', 'fde', 'Logging in an application helps you:', ['Understand what happened when something goes wrong', 'Make the app look better', 'Reduce the number of users', 'Increase the server price']),

  // ---------- Data Science ----------
  q('ds-01', 'data-science', 'What is the median of 3, 7, 9, 15, 20?', ['9', '7', '10.8', '15']),
  q('ds-02', 'data-science', 'Machine learning is best described as:', ['Systems that learn patterns from data', 'Manually writing every rule', 'A type of computer monitor', 'Data entry']),
  q('ds-03', 'data-science', "Predicting a house's price (a number) from its features is a:", ['Regression problem', 'Classification problem', 'Clustering problem', 'Sorting problem']),
  q('ds-04', 'data-science', 'Which chart best shows the trend of sales over 12 months?', ['Line chart', 'Pie chart', 'Word cloud', 'Organisation chart']),
  q('ds-05', 'data-science', 'Missing values in a dataset should be:', ['Handled deliberately, e.g. filled or removed with a reason', 'Always ignored', 'Replaced with random text', 'Left for the model to guess']),
  q('ds-06', 'data-science', 'A model that does well on training data but badly on new data is:', ['Overfitting', 'Underfitting', 'Normalising', 'Encrypting']),
  q('ds-07', 'data-science', 'Correlation between two variables tells you:', ['How strongly they move together', 'That one definitely causes the other', 'The average of both', 'Their total']),
  q('ds-08', 'data-science', 'Which Python library is widely used for working with tables of data?', ['pandas', 'Photoshop', 'WordPress', 'Tally']),
  q('ds-09', 'data-science', 'Splitting data into training and test sets helps you:', ['Check how the model performs on unseen data', 'Make the dataset larger', 'Remove all errors', 'Speed up the internet']),
  q('ds-10', 'data-science', 'For a fair coin, the probability of getting heads is:', ['0.5', '0.25', '0.75', '1']),

  // ---------- Data & Business Analytics ----------
  q('an-01', 'analytics', 'In SQL, which keyword filters rows?', ['WHERE', 'ORDER BY', 'SELECT', 'FROM']),
  q('an-02', 'analytics', 'A KPI is:', ['A key measure used to track performance', 'A type of database', 'A programming error', 'A spreadsheet formula']),
  q('an-03', 'analytics', 'A dashboard is mainly used to:', ['Show key metrics visually at a glance', 'Store raw backups', 'Write code', 'Send invoices']),
  q('an-04', 'analytics', 'Sales were ₹8 lakh last month and ₹10 lakh this month. What is the growth?', ['25%', '20%', '2%', '80%']),
  q('an-05', 'analytics', 'Which tool is commonly used to build business dashboards?', ['Power BI', 'Notepad', 'Paint', 'WinZip']),
  q('an-06', 'analytics', 'Which Excel function adds up a range of cells?', ['SUM', 'COUNT', 'LEN', 'TODAY']),
  q('an-07', 'analytics', 'Which chart is best for comparing sales across 5 regions?', ['Bar chart', 'Line chart', 'Scatter plot', 'Gauge']),
  q('an-08', 'analytics', 'Which "average" is least affected by one very large value?', ['Median', 'Mean', 'Maximum', 'Total']),
  q('an-09', 'analytics', 'A/B testing is used to:', ['Compare two versions to see which performs better', 'Back up two databases', 'Test two laptops', 'Encrypt data twice']),
  q('an-10', 'analytics', 'Data cleaning means:', ['Fixing errors, duplicates and inconsistencies in data', 'Deleting the whole dataset', 'Formatting fonts', 'Buying new data']),
]

export const BANK_BY_ID = new Map(BANK.map((b) => [b.id, b]))
