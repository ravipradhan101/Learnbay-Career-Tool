import type { BankItem } from './types'

// Data & Business Analytics: 50 questions. First option is always the correct one (options are shuffled per learner).
export const QUESTIONS: BankItem[] = [
  // Aptitude (12): verbal and logical reasoning, no numbers
  ['Aptitude', 'Chart is to dashboard as page is to what?', ['Book', 'Pen', 'Printer', 'Reader']],
  ['Aptitude', 'Row is to table as word is to what?', ['Sentence', 'Alphabet', 'Handwriting', 'Pencil']],
  ['Aptitude', 'Pick the odd one out: Mean, Median, Mode, Pivot.', ['Pivot', 'Mean', 'Median', 'Mode']],
  ['Aptitude', 'Pick the odd one out by meaning: Increase, Grow, Rise, Decline.', ['Decline', 'Increase', 'Grow', 'Rise']],
  ['Aptitude', 'All dashboards are reports. All reports use data. So all dashboards...', ['Use data', 'Are spreadsheets', 'Need coding skills', 'Show only charts']],
  ['Aptitude', 'Every KPI here is tracked weekly. Revenue is a KPI here. So revenue is...', ['Tracked weekly', 'Tracked only yearly', 'Never tracked', 'The only KPI']],
  ['Aptitude', 'If it rains, umbrella sales rise. It rained today. So umbrella sales likely...', ['Rose today', 'Fell today', 'Stopped entirely', 'Moved to online']],
  ['Aptitude', 'Which word is formed by rearranging all the letters of SALES?', ['Seals', 'Sells', 'Scale', 'Slate']],
  ['Aptitude', 'Which word is opposite in meaning to aggregate?', ['Separate', 'Combine', 'Accumulate', 'Consolidate']],
  ['Aptitude', 'Which step usually comes first in an analytics project?', ['Define the business question', 'Build the final dashboard', 'Present the final recommendations', 'Pick the chart colours']],
  ['Aptitude', 'Sales dropped right after the checkout page changed. What should you check first?', ['The checkout page change', 'The office cafeteria menu', 'The company logo colour', 'The staff holiday list']],
  ['Aptitude', 'You spot an error in your report before a client meeting. Best action?', ['Flag it and correct it', 'Present it without mentioning', 'Delete the whole report', 'Blame another team member']],

  // Full form (12)
  ['Full form', 'What does KPI stand for?', ['Key Performance Indicator', 'Key Profitability Index', 'Knowledge Process Integration', 'Key Planning Item']],
  ['Full form', 'What does SQL stand for?', ['Structured Query Language', 'Simple Question Logic', 'Standard Queue List', 'Sequential Question Library']],
  ['Full form', 'In analytics, what does BI stand for?', ['Business Intelligence', 'Basic Information', 'Business Infrastructure', 'Budget Index']],
  ['Full form', 'What does ETL stand for in data work?', ['Extract, Transform, Load', 'Evaluate, Translate, Launch', 'Export, Track, Link', 'Edit, Tag, Log']],
  ['Full form', 'What does CSV stand for?', ['Comma-Separated Values', 'Common Sheet Viewer', 'Column Sorted Values', 'Calculated Summary View']],
  ['Full form', 'What does ROI stand for?', ['Return on Investment', 'Rate of Interest', 'Record of Income', 'Revenue over Inventory']],
  ['Full form', 'What does CRM stand for?', ['Customer Relationship Management', 'Central Revenue Model', 'Client Reporting Method', 'Customer Retention Metric']],
  ['Full form', 'In analytics, what does EDA stand for?', ['Exploratory Data Analysis', 'Estimated Data Average', 'External Data Access', 'Enterprise Data Administration']],
  ['Full form', 'What does GenAI stand for?', ['Generative Artificial Intelligence', 'Genetic Artificial Intelligence', 'Generalised Analytics Interface', 'Generated Answer Index']],
  ['Full form', 'In digital marketing analytics, what does CTR stand for?', ['Click-Through Rate', 'Customer Tracking Report', 'Cost To Revenue', 'Conversion Target Ratio']],
  ['Full form', 'What does DBMS stand for?', ['Database Management System', 'Data Backup Monitoring Software', 'Digital Business Model Suite', 'Dashboard Building Management Service']],
  ['Full form', 'What does LLM stand for?', ['Large Language Model', 'Linear Learning Method', 'Logical Language Machine', 'Low Latency Model']],

  // Concept (14)
  ['Concept', 'What does a KPI help a business do?', ['Track progress toward a goal', 'Store raw data files', 'Design the company brand logo', 'Replace the sales team']],
  ['Concept', 'Which SQL keyword filters rows based on a condition?', ['WHERE', 'SELECT', 'FROM', 'ORDER BY']],
  ['Concept', 'Which SQL keyword combines rows from two related tables?', ['JOIN', 'WHERE', 'LIMIT', 'DISTINCT']],
  ['Concept', 'Which SQL clause groups rows that share the same value?', ['GROUP BY', 'ORDER BY', 'WHERE', 'INSERT']],
  ['Concept', 'Which chart best shows a trend over time?', ['Line chart', 'Pie chart', 'Treemap', 'Word cloud']],
  ['Concept', 'Which chart best shows the parts of a single whole?', ['Pie chart', 'Line chart', 'Scatter plot', 'Histogram']],
  ['Concept', 'Which chart best shows the relationship between two numeric variables?', ['Scatter plot', 'Pie chart', 'Donut chart', 'Funnel chart']],
  ['Concept', 'What is A/B testing mainly used for?', ['Comparing two versions', 'Backing up data twice', 'Grading analysts by skill', 'Sorting data alphabetically']],
  ['Concept', 'What does data cleaning mainly involve?', ['Fixing errors and gaps', 'Deleting the whole dataset', 'Adding colours to charts', 'Buying new data servers']],
  ['Concept', 'What is a duplicate record in a dataset?', ['A repeated copy of an entry', 'An entry with missing values', 'The most recent entry', 'An entry from another table']],
  ['Concept', 'What is an outlier in a dataset?', ['A value far from the rest', 'The most common value', 'A missing column header', 'The first row in the dataset']],
  ['Concept', 'What is the main purpose of a business dashboard?', ['Show key metrics at a glance', 'Store employee passwords securely', 'Write program code', 'Send marketing emails']],
  ['Concept', 'How can GenAI tools help a data analyst?', ['Draft summaries and suggest queries', 'Guarantee every single answer is correct', 'Remove the need for data', 'Cancel all data privacy rules']],
  ['Concept', 'In business analytics, what does customer churn mean?', ['Customers stopping using a service', 'Customers joining a service', 'Customers writing online product reviews', 'Customers paying in advance']],

  // Tools (12)
  ['Tools', 'Which tool is mainly used to build interactive business dashboards?', ['Power BI', 'Notepad', 'Zoom', 'WordPress']],
  ['Tools', 'What is Microsoft Excel mainly used for?', ['Organising data in spreadsheets', 'Editing and trimming video clips', 'Hosting company websites', 'Making video calls']],
  ['Tools', 'Which spreadsheet function looks up a value in a table?', ['VLOOKUP', 'SUM', 'TRIM', 'CONCATENATE']],
  ['Tools', 'Which spreadsheet function removes extra spaces from text?', ['TRIM', 'COUNT', 'ROUND', 'VLOOKUP']],
  ['Tools', 'Which spreadsheet function returns different results based on a condition?', ['IF', 'LEN', 'SUM', 'UPPER']],
  ['Tools', 'Which spreadsheet feature quickly summarises large data by category?', ['Pivot table', 'Spell check', 'Page layout', 'Text wrap']],
  ['Tools', 'What is Tableau mainly used for?', ['Building charts and dashboards', 'Writing legal contracts', 'Managing employee email inboxes', 'Designing mobile games']],
  ['Tools', 'Which language is used to query relational databases?', ['SQL', 'HTML', 'CSS', 'Markdown']],
  ['Tools', 'Which free Google tool builds shareable reports and dashboards?', ['Looker Studio', 'Google Maps', 'Google Keep', 'Google Translate']],
  ['Tools', 'Google Sheets is best described as which kind of tool?', ['Online spreadsheet app', 'Photo editing app', 'Video meeting app', 'Music and podcast streaming app']],
  ['Tools', 'Which tool lets analysts run Python code in interactive notebooks?', ['Jupyter Notebook', 'PowerPoint', 'Outlook', 'Adobe Illustrator']],
  ['Tools', 'Which of these is a GenAI chat assistant?', ['ChatGPT', 'MySQL', 'Notepad', 'Jupyter Notebook']],
]
