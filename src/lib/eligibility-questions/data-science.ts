import type { BankItem } from './types'

// Data Science: 50 questions. First option is always the correct one (options are shuffled per learner).
export const QUESTIONS: BankItem[] = [
  // Aptitude (12)
  ['Aptitude', 'Data is to insight as ore is to what?', ['Metal', 'Mine', 'Shovel', 'Rock']],
  ['Aptitude', 'Which word is the odd one out: mean, median, mode, histogram?', ['Histogram', 'Mean', 'Median', 'Mode']],
  ['Aptitude', 'All analysts use data. Priya is an analyst. What must be true?', ['Priya uses data', 'Priya writes code daily', 'All data users are analysts', 'Priya manages a team']],
  ['Aptitude', 'What should come first in a data project?', ['Understand the business problem', 'Deploy the final model to production', 'Pick colours for charts', 'Tune model settings']],
  ['Aptitude', 'A model is trained on biased data. What is the likely effect?', ['Biased predictions', 'Faster training', 'Smaller file size', 'Guaranteed perfect accuracy']],
  ['Aptitude', 'DATA becomes ATAD. Following the same rule, MODEL becomes what?', ['LEDOM', 'MODLE', 'LEDMO', 'DOMEL']],
  ['Aptitude', 'Training data is to learning as test data is to what?', ['Evaluating', 'Collecting', 'Downloading', 'Labelling']],
  ['Aptitude', 'You spot an error in a report you already shared. Best action?', ['Tell them and correct it', 'Ignore it quietly', 'Delete the report secretly', 'Blame a teammate']],
  ['Aptitude', 'Every row with missing age was removed. What must now be true?', ['No remaining row lacks age', 'Age is the target column', 'The dataset became larger', 'Every other column was removed']],
  ['Aptitude', 'Which is the odd one out: bar chart, line chart, scatter plot, database?', ['Database', 'Bar chart', 'Line chart', 'Scatter plot']],
  ['Aptitude', 'If the pipeline fails, no report is sent. A report was sent. So?', ['The pipeline did not fail', 'The pipeline failed', 'The report is wrong', 'The report contains no errors']],
  ['Aptitude', 'Doctor is to diagnosis as a trained model is to what?', ['Prediction', 'Hospital', 'Spreadsheet', 'Salary']],

  // Full form (12)
  ['Full form', 'What does ML stand for?', ['Machine Learning', 'Model Logic', 'Memory Layer', 'Multiple Linear Logic']],
  ['Full form', 'What does NLP stand for?', ['Natural Language Processing', 'Neural Logic Programming', 'Network Layer Protocol', 'Numeric Learning Pattern Processing']],
  ['Full form', 'What does SQL stand for?', ['Structured Query Language', 'Simple Question Logic', 'Sequential Query List', 'Standard Quality Logic Layer']],
  ['Full form', 'What does CSV stand for?', ['Comma-Separated Values', 'Common Structured Variable', 'Coded Sheet Viewer', 'Column Sorted Values']],
  ['Full form', 'In data science, what does EDA stand for?', ['Exploratory Data Analysis', 'Estimated Data Accuracy Assessment', 'External Data Access', 'Encoded Data Archive']],
  ['Full form', 'What does LLM stand for?', ['Large Language Model', 'Linear Learning Method', 'Low Latency Machine', 'Layered Logic Module']],
  ['Full form', 'What does GPT stand for?', ['Generative Pre-trained Transformer', 'General Purpose Transformer Technology', 'Graph Processing Technique', 'Guided Prediction Tree']],
  ['Full form', 'In deep learning, what does CNN stand for?', ['Convolutional Neural Network', 'Central Node Network', 'Connected Neuron Nodes', 'Computed Numeric Neural Network']],
  ['Full form', 'What does API stand for?', ['Application Programming Interface', 'Automated Program Integration Index', 'Advanced Processing Input', 'Applied Prediction Integration']],
  ['Full form', 'In generative AI, what does RAG stand for?', ['Retrieval-Augmented Generation', 'Random Answer Generator', 'Rapid AI Gateway', 'Recursive Attention Graph Generator']],
  ['Full form', 'In data engineering, what does ETL stand for?', ['Extract, Transform, Load', 'Estimate, Transfer, Launch', 'Enter, Track, Log', 'Encode, Transfer, Link']],
  ['Full form', 'What does PCA stand for?', ['Principal Component Analysis', 'Predictive Cluster Algorithm', 'Primary Classification Assignment', 'Partial Correlation Average']],

  // Concept (14)
  ['Concept', 'Supervised learning learns from what kind of data?', ['Labelled examples', 'Unlabelled examples', 'Deleted records', 'Compressed files']],
  ['Concept', 'Predicting the price of a house is which type of task?', ['Regression', 'Classification', 'Clustering', 'Data cleaning']],
  ['Concept', 'Deciding whether an email is spam is which type of task?', ['Classification', 'Regression', 'Clustering', 'Dimensionality reduction']],
  ['Concept', 'Grouping similar customers without any labels is called what?', ['Clustering', 'Regression', 'Classification', 'Labelling']],
  ['Concept', 'What does overfitting mean?', ['Fitting training data too closely', 'Learning too little from training data', 'Training faster than expected', 'Using too few rows']],
  ['Concept', 'Why do we keep a separate test set?', ['To judge performance on unseen data', 'To make training faster', 'To enlarge the overall training dataset', 'To back up raw files']],
  ['Concept', 'In a dataset, what is a feature?', ['An input variable', 'The final prediction', 'A missing value', 'A chart title']],
  ['Concept', 'With extreme outliers, which average usually represents typical values better?', ['Median', 'Mean', 'Maximum', 'Total']],
  ['Concept', 'If two variables are correlated, they...', ['Tend to move together', 'Always cause each other', 'Have identical values', 'Come from one table']],
  ['Concept', 'Surveying only app users to judge all customers risks what?', ['Sampling bias', 'Overfitting', 'Data leakage', 'Model underfitting']],
  ['Concept', 'What is a common way to handle missing values?', ['Fill them with a sensible value', 'Rename the whole column', 'Change the file format', 'Sort all the rows alphabetically']],
  ['Concept', 'Which chart best shows a trend over time?', ['Line chart', 'Pie chart', 'Word cloud', 'Venn diagram']],
  ['Concept', 'In generative AI, what is a prompt?', ['Instruction given to the model', 'The full dataset used for training', 'Graphics card memory', 'An accuracy score']],
  ['Concept', 'In generative AI, what is a hallucination?', ['A confident but false answer', 'A slow model response', 'A blocked or refused user request', 'An image editing feature']],

  // Tools (12)
  ['Tools', 'What is the Python library pandas mainly used for?', ['Analysing tabular data', 'Editing video files', 'Building native mobile apps', 'Managing email inboxes']],
  ['Tools', 'What is NumPy mainly used for?', ['Fast array operations', 'Styling web pages', 'Backing up large databases', 'Drawing vector logos']],
  ['Tools', 'Which library is known for classic machine learning algorithms?', ['scikit-learn', 'Matplotlib', 'BeautifulSoup', 'Flask']],
  ['Tools', 'What is Matplotlib mainly used for?', ['Creating charts and plots', 'Hosting web servers', 'Encrypting files', 'Scheduling team meetings online']],
  ['Tools', 'What is Jupyter Notebook mainly used for?', ['Running code with notes', 'Video conferencing', 'Accounting and invoicing', 'Photo editing']],
  ['Tools', 'TensorFlow and PyTorch are mainly used for what?', ['Deep learning models', 'Writing office documents', 'Managing server passwords', 'Designing slide decks']],
  ['Tools', 'Which tool fits building interactive business dashboards?', ['Power BI', 'BeautifulSoup', 'Docker', 'PyTorch']],
  ['Tools', 'What is Git mainly used for?', ['Tracking code versions', 'Training neural networks', 'Plotting graphs', 'Cleaning datasets']],
  ['Tools', 'What is Seaborn mainly used for?', ['Statistical data visualisation', 'Web scraping', 'Deploying trained models to servers', 'Storing databases']],
  ['Tools', 'Which tool helps extract data from web pages?', ['BeautifulSoup', 'Jupyter Notebook', 'NumPy', 'Matplotlib']],
  ['Tools', 'Hugging Face is best known for what?', ['Sharing pretrained AI models', 'Cloud file storage and backup', 'Spreadsheet formulas', 'Video streaming']],
  ['Tools', 'What is Docker mainly used for?', ['Packaging apps in containers', 'Plotting data', 'Labelling images', 'Writing and running SQL queries']],
]
