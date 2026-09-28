import type { BankItem } from './types'

// Cloud & DevOps: 50 questions. First option is always the correct one (options are shuffled per learner).
export const QUESTIONS: BankItem[] = [
  // Aptitude (12): verbal and logical reasoning, no numbers
  ['Aptitude', 'Source code is to repository as container image is to?', ['Registry', 'Compiler', 'Firewall', 'Terminal']],
  ['Aptitude', 'Odd one out: Azure, AWS, Google Cloud, Git', ['Git', 'Azure', 'AWS', 'Google Cloud']],
  ['Aptitude', 'All pipelines have stages. Build is a pipeline. What must be true?', ['Build has stages', 'Build has no stages', 'Every stage is a build', 'Stages never need pipelines']],
  ['Aptitude', 'Fill the blank in order: write code, commit, ___, deploy.', ['Build and test', 'Monitor users', 'Archive project', 'Delete branch']],
  ['Aptitude', 'A server runs out of disk space. What is the likely effect?', ['Apps fail to save data', 'Network becomes faster', 'CPU gains extra cores', 'Passwords reset automatically']],
  ['Aptitude', 'A deployment breaks production. What should the team do first?', ['Roll back the change', 'Delete the server logs', 'Ignore it until Monday', 'Turn off monitoring alerts']],
  ['Aptitude', 'What comes next in the DevOps loop: plan, code, build, test, ?', ['Release', 'Plan', 'Code', 'Rewrite']],
  ['Aptitude', 'Kubernetes is to containers as a conductor is to?', ['Musicians', 'Tickets', 'Audience', 'Spectators']],
  ['Aptitude', 'Every deploy runs tests first. A deploy happened today. What must be true?', ['Tests ran before it', 'Tests were skipped today', 'The deploy failed', 'No code was changed']],
  ['Aptitude', 'Odd one out: Docker, Podman, containerd, Excel', ['Excel', 'Docker', 'Podman', 'containerd']],
  ['Aptitude', 'Thermometer is to temperature as a monitoring tool is to?', ['System health', 'Code syntax', 'Team hiring', 'Office furniture']],
  ['Aptitude', 'Some servers are virtual. All virtual servers run on hardware. What follows?', ['Some servers run on hardware', 'No servers ever use hardware', 'All servers must be virtual', 'Hardware itself is always virtual']],

  // Full form (12)
  ['Full form', 'What does CI/CD stand for?', ['Continuous Integration, Continuous Delivery', 'Code Inspection, Code Deployment', 'Cloud Integration, Cloud Delivery', 'Constant Inspection, Continuous Distribution']],
  ['Full form', 'What does AWS stand for?', ['Amazon Web Services', 'Automated Web Servers', 'Advanced Web Security', 'Amazon Workflow System']],
  ['Full form', 'What does GCP stand for?', ['Google Cloud Platform', 'Global Compute Protocol', 'Google Container Program', 'General Cloud Provider']],
  ['Full form', 'What does IaC stand for?', ['Infrastructure as Code', 'Integration and Compliance', 'Internet as Cloud', 'Instance and Container']],
  ['Full form', 'In cloud computing, what does VM stand for?', ['Virtual Machine', 'Visual Monitor', 'Version Manager', 'Volume Mount']],
  ['Full form', 'What does IaaS stand for?', ['Infrastructure as a Service', 'Internet as a Service', 'Integration as a Service', 'Information and Access as a Service']],
  ['Full form', 'What does SaaS stand for?', ['Software as a Service', 'Storage as a Service', 'Security as a Service', 'Server as a Service']],
  ['Full form', 'What does AIOps stand for?', ['Artificial Intelligence for IT Operations', 'Automated Integration for IT Operations', 'Advanced Infrastructure and Internet Operations', 'Applied Intelligence for Internet Operations']],
  ['Full form', 'What does MLOps stand for?', ['Machine Learning Operations', 'Multi-Layer Orchestration Services', 'Managed Linux Operations', 'Model Logging Operations']],
  ['Full form', 'In AWS, what does VPC stand for?', ['Virtual Private Cloud', 'Virtual Public Channel', 'Verified Private Connection', 'Variable Processing Cluster']],
  ['Full form', 'What does SRE stand for?', ['Site Reliability Engineering', 'Systems Resilience Engineering', 'Server Recovery Environment', 'Secure Release Engineering']],
  ['Full form', 'What does DNS stand for?', ['Domain Name System', 'Digital Network Service', 'Data Node Server', 'Dynamic Network Setup']],

  // Concept (14)
  ['Concept', 'What is the main benefit of cloud auto-scaling?', ['Matches resources to demand', 'Writes application code automatically', 'Removes the need for backups', 'Encrypts every file by default']],
  ['Concept', 'Which cloud model gives you a ready-to-use app like email?', ['SaaS', 'IaaS', 'PaaS', 'On-premises']],
  ['Concept', 'What does a container package together?', ['An app and its dependencies', 'A laptop and its charger', 'Only the host kernel', 'Network cables and switches']],
  ['Concept', 'What is Continuous Integration mainly about?', ['Frequently merging and testing code', 'Buying new servers regularly', 'Writing documentation after release', 'Manually copying files to servers']],
  ['Concept', 'What is the main idea of Infrastructure as Code?', ['Managing servers with config files', 'Running apps without any hardware', 'Drawing network diagrams by hand', 'Editing code directly on production']],
  ['Concept', 'In Git, what is a branch used for?', ['Isolating work on new changes', 'Deleting old repositories', 'Speeding up internet downloads', 'Storing user passwords securely']],
  ['Concept', 'What does Kubernetes do when a container crashes?', ['Restarts or replaces it', 'Deletes the whole cluster', 'Emails the cloud provider', 'Shuts down every server']],
  ['Concept', 'What is a rollback in software deployment?', ['Returning to a previous version', 'Adding new features very quickly', 'Upgrading server hardware', 'Merging two code branches']],
  ['Concept', 'What is AIOps mainly used for?', ['Spotting IT incidents using AI', 'Designing company logos with AI', 'Replacing cloud providers entirely', 'Writing marketing emails automatically']],
  ['Concept', 'What is MLOps mainly concerned with?', ['Deploying and maintaining ML models', 'Designing ergonomic computer keyboards', 'Managing office payroll', 'Building mobile game graphics']],
  ['Concept', 'What is a region in cloud computing?', ['A geographic area of data centres', 'A type of programming language', 'A discounted long-term billing plan', 'A user permission group']],
  ['Concept', 'What does serverless computing mean for developers?', ['No server management needed', 'Apps run without any hardware', 'Code runs only on laptops', 'Servers are physically removed']],
  ['Concept', 'Why do software teams use version control?', ['To track code changes', 'To boost screen brightness', 'To compress video files', 'To cool data centres']],
  ['Concept', 'What is a load balancer used for?', ['Spreading traffic across servers', 'Storing backup files', 'Writing test cases', 'Encrypting source code repositories']],

  // Tools (12)
  ['Tools', 'What is Docker mainly used for?', ['Building and running containers', 'Editing spreadsheets', 'Designing mobile user interfaces', 'Sending bulk emails']],
  ['Tools', 'Which tool is widely used to orchestrate containers at scale?', ['Kubernetes', 'Prometheus', 'Git', 'Postman']],
  ['Tools', 'What is Jenkins mainly used for?', ['Automating builds and deployments', 'Storing and scanning container images', 'Drawing metrics dashboards', 'Managing DNS records']],
  ['Tools', 'Which tool provisions cloud infrastructure from declarative code?', ['Terraform', 'Grafana', 'Jira', 'Wireshark']],
  ['Tools', 'What is Git used for?', ['Tracking changes in source code', 'Monitoring server CPU and memory', 'Running virtual machines', 'Designing database tables']],
  ['Tools', 'What is Prometheus mainly used for?', ['Collecting and storing metrics', 'Writing infrastructure as code files', 'Building container images', 'Hosting Git repositories']],
  ['Tools', 'Which tool is best known for dashboards that visualise metrics?', ['Grafana', 'Terraform', 'Maven', 'Ansible']],
  ['Tools', 'What is Ansible mainly used for?', ['Automating server configuration', 'Designing responsive web pages', 'Compressing log files', 'Training machine learning models']],
  ['Tools', 'Which is Amazon’s cloud object storage service?', ['Amazon S3', 'Amazon EC2', 'AWS Lambda', 'Amazon VPC']],
  ['Tools', 'What is GitHub Actions mainly used for?', ['Automating CI/CD workflows', 'Hosting video calls', 'Monitoring server temperature', 'Designing slide decks']],
  ['Tools', 'Which tool is popular for tracking machine learning experiments?', ['MLflow', 'Nginx', 'Jenkins', 'Helm']],
  ['Tools', 'What is Helm used for in Kubernetes?', ['Packaging and installing apps', 'Monitoring network traffic', 'Writing automated unit tests', 'Managing Git branch permissions']],
]
