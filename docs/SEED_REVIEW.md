# Seed Data Review Sheet

Human-readable view of `shared/seed/*.json`. **Review this, not the JSON.** Reply with changes like *"remove X from Data Analyst"*, *"make Y a prerequisite of Z"*, *"importance of A should be higher"*.

**71 skills · 80 prerequisite links · 21 related links · 5 careers.** All validator rules V1–V11 pass with no warnings; 1,500 random profiles simulated with no path deadlock.

Difficulty 1 (easy) – 5 (hard) is used for effort estimates. *Requires* means a prerequisite: it must reach the level that the **career** expects before this skill counts as "ready".

## 1. Skills and their prerequisites

### Programming (10)

| Skill | Difficulty | Requires |
|---|---|---|
| Programming Fundamentals | 1 | — |
| Python | 2 | Programming Fundamentals |
| JavaScript | 2 | Programming Fundamentals |
| TypeScript | 3 | JavaScript |
| Java | 3 | Programming Fundamentals |
| C | 3 | Programming Fundamentals |
| C++ | 4 | C |
| Data Structures & Algorithms | 4 | Programming Fundamentals |
| Object-Oriented Programming | 3 | Programming Fundamentals |
| Design Patterns | 4 | Object-Oriented Programming |

### Web Development (4)

| Skill | Difficulty | Requires |
|---|---|---|
| HTML | 1 | — |
| CSS | 2 | HTML |
| HTTP Fundamentals | 2 | Networking Basics |
| REST APIs | 3 | HTTP Fundamentals |

### Frontend (4)

| Skill | Difficulty | Requires |
|---|---|---|
| Responsive Design | 2 | CSS |
| React | 3 | JavaScript, CSS |
| State Management | 3 | React |
| Next.js | 3 | React |

### Backend (4)

| Skill | Difficulty | Requires |
|---|---|---|
| Node.js | 3 | JavaScript |
| Express | 3 | Node.js, HTTP Fundamentals |
| Authentication & JWT | 3 | REST APIs, Web Security Basics |
| System Design Basics | 4 | REST APIs, Relational Database Design |

### Database (5)

| Skill | Difficulty | Requires |
|---|---|---|
| SQL | 2 | — |
| Relational Database Design | 3 | SQL |
| PostgreSQL | 3 | SQL |
| MongoDB | 3 | SQL |
| Redis | 3 | SQL |

### Data Analytics (8)

| Skill | Difficulty | Requires |
|---|---|---|
| Statistics | 3 | — |
| NumPy | 2 | Python |
| Pandas | 3 | Python, NumPy |
| Data Cleaning | 2 | Pandas |
| Data Visualization | 3 | Pandas |
| Exploratory Data Analysis | 3 | Data Cleaning, Data Visualization, Statistics |
| Excel | 1 | — |
| BI Tools (Power BI / Tableau) | 2 | SQL, Excel |

### Machine Learning (10)

| Skill | Difficulty | Requires |
|---|---|---|
| Linear Algebra | 3 | — |
| Machine Learning Fundamentals | 4 | Python, Statistics, Linear Algebra |
| Supervised Learning | 3 | Machine Learning Fundamentals |
| Unsupervised Learning | 3 | Machine Learning Fundamentals |
| Regression | 3 | Supervised Learning |
| Classification | 3 | Supervised Learning |
| Clustering | 3 | Unsupervised Learning |
| Feature Engineering | 4 | Pandas, Machine Learning Fundamentals |
| Model Evaluation | 3 | Supervised Learning |
| Scikit-learn | 3 | Machine Learning Fundamentals, NumPy |

### Deep Learning (6)

| Skill | Difficulty | Requires |
|---|---|---|
| Neural Networks | 4 | Supervised Learning, Linear Algebra |
| Deep Learning | 4 | Neural Networks |
| PyTorch | 4 | Deep Learning, NumPy |
| TensorFlow | 4 | Deep Learning, NumPy |
| Natural Language Processing | 4 | Classification |
| Computer Vision | 4 | Deep Learning |

### AI / LLM (6)

| Skill | Difficulty | Requires |
|---|---|---|
| Prompt Engineering | 1 | — |
| LLM APIs | 2 | Python, Prompt Engineering |
| Embeddings | 3 | LLM APIs |
| Vector Databases | 3 | Embeddings |
| Retrieval-Augmented Generation | 4 | LLM APIs, Vector Databases |
| AI Agents | 4 | LLM APIs, Retrieval-Augmented Generation |

### Cloud (2)

| Skill | Difficulty | Requires |
|---|---|---|
| Cloud Fundamentals | 2 | Linux |
| AWS | 3 | Cloud Fundamentals |

### DevOps (4)

| Skill | Difficulty | Requires |
|---|---|---|
| Linux | 2 | Command Line |
| Docker | 3 | Linux |
| CI/CD | 3 | GitHub, Unit Testing |
| MLOps | 4 | Docker, Scikit-learn |

### Cybersecurity (2)

| Skill | Difficulty | Requires |
|---|---|---|
| Networking Basics | 2 | — |
| Web Security Basics | 3 | HTTP Fundamentals |

### Tools (6)

| Skill | Difficulty | Requires |
|---|---|---|
| Git | 2 | — |
| GitHub | 1 | Git |
| Command Line | 1 | — |
| Jupyter Notebooks | 1 | Python |
| Unit Testing | 2 | Programming Fundamentals |
| Agile & Scrum | 1 | — |

## 2. Careers

Each row: importance (0–1, label) and the level a student should reach (1 Beginner · 2 Basic · 3 Intermediate · 4 Advanced · 5 Expert). Sorted by importance.

### Software Developer — 26 skills

Designs, builds, tests and maintains software. Strong on programming fundamentals, data structures, design and engineering practice.

| Skill | Importance | Required level |
|---|---|---|
| Data Structures & Algorithms | 1.0 (Very High) | 4 |
| Object-Oriented Programming | 0.9 (Very High) | 4 |
| Git | 0.8 (High) | 4 |
| Programming Fundamentals | 0.7 (High) | 4 |
| Java | 0.7 (High) | 3 |
| REST APIs | 0.7 (High) | 3 |
| SQL | 0.7 (High) | 3 |
| Unit Testing | 0.7 (High) | 3 |
| Design Patterns | 0.6 (Medium) | 3 |
| GitHub | 0.6 (Medium) | 3 |
| Python | 0.6 (Medium) | 3 |
| Relational Database Design | 0.6 (Medium) | 3 |
| System Design Basics | 0.6 (Medium) | 3 |
| Command Line | 0.5 (Medium) | 3 |
| HTTP Fundamentals | 0.5 (Medium) | 3 |
| Linux | 0.5 (Medium) | 3 |
| Web Security Basics | 0.5 (Medium) | 2 |
| Agile & Scrum | 0.4 (Low) | 2 |
| CI/CD | 0.4 (Low) | 2 |
| Docker | 0.4 (Low) | 2 |
| Networking Basics | 0.4 (Low) | 2 |
| PostgreSQL | 0.4 (Low) | 2 |
| AWS | 0.3 (Low) | 2 |
| C | 0.3 (Low) | 2 |
| C++ | 0.3 (Low) | 2 |
| Cloud Fundamentals | 0.3 (Low) | 2 |

### Full Stack Developer — 32 skills

Builds complete web applications: React front ends, Node.js back ends, databases and deployment.

| Skill | Importance | Required level |
|---|---|---|
| JavaScript | 1.0 (Very High) | 4 |
| React | 1.0 (Very High) | 4 |
| Express | 0.9 (Very High) | 4 |
| Node.js | 0.9 (Very High) | 4 |
| REST APIs | 0.9 (Very High) | 4 |
| CSS | 0.8 (High) | 4 |
| HTML | 0.8 (High) | 4 |
| Git | 0.8 (High) | 3 |
| MongoDB | 0.8 (High) | 3 |
| Authentication & JWT | 0.7 (High) | 3 |
| GitHub | 0.6 (Medium) | 3 |
| HTTP Fundamentals | 0.6 (Medium) | 3 |
| SQL | 0.6 (Medium) | 3 |
| TypeScript | 0.6 (Medium) | 3 |
| Next.js | 0.5 (Medium) | 3 |
| PostgreSQL | 0.5 (Medium) | 3 |
| Programming Fundamentals | 0.5 (Medium) | 3 |
| Responsive Design | 0.5 (Medium) | 3 |
| State Management | 0.5 (Medium) | 3 |
| Unit Testing | 0.5 (Medium) | 3 |
| Web Security Basics | 0.5 (Medium) | 2 |
| CI/CD | 0.4 (Low) | 2 |
| Command Line | 0.4 (Low) | 2 |
| Docker | 0.4 (Low) | 2 |
| Relational Database Design | 0.4 (Low) | 2 |
| System Design Basics | 0.4 (Low) | 2 |
| AWS | 0.3 (Low) | 2 |
| Agile & Scrum | 0.3 (Low) | 2 |
| Cloud Fundamentals | 0.3 (Low) | 2 |
| Linux | 0.3 (Low) | 2 |
| Networking Basics | 0.3 (Low) | 2 |
| Redis | 0.3 (Low) | 2 |

### Data Analyst — 17 skills

Turns data into answers with SQL, spreadsheets, Python and dashboards.

| Skill | Importance | Required level |
|---|---|---|
| SQL | 1.0 (Very High) | 4 |
| BI Tools (Power BI / Tableau) | 0.8 (High) | 4 |
| Data Cleaning | 0.8 (High) | 4 |
| Data Visualization | 0.8 (High) | 4 |
| Excel | 0.8 (High) | 4 |
| Pandas | 0.8 (High) | 3 |
| Statistics | 0.8 (High) | 3 |
| Exploratory Data Analysis | 0.7 (High) | 3 |
| Python | 0.7 (High) | 3 |
| Jupyter Notebooks | 0.4 (Low) | 3 |
| Git | 0.4 (Low) | 2 |
| NumPy | 0.4 (Low) | 2 |
| Programming Fundamentals | 0.4 (Low) | 2 |
| Agile & Scrum | 0.3 (Low) | 2 |
| Command Line | 0.3 (Low) | 2 |
| GitHub | 0.3 (Low) | 2 |
| PostgreSQL | 0.3 (Low) | 2 |

### Data Scientist — 24 skills

Uses statistics and machine learning to find insights and build predictive models.

| Skill | Importance | Required level |
|---|---|---|
| Python | 1.0 (Very High) | 4 |
| Statistics | 1.0 (Very High) | 4 |
| Machine Learning Fundamentals | 0.9 (Very High) | 4 |
| Pandas | 0.9 (Very High) | 4 |
| Classification | 0.8 (High) | 4 |
| Data Visualization | 0.8 (High) | 4 |
| Exploratory Data Analysis | 0.8 (High) | 4 |
| Model Evaluation | 0.8 (High) | 4 |
| Regression | 0.8 (High) | 4 |
| Scikit-learn | 0.8 (High) | 4 |
| Supervised Learning | 0.8 (High) | 4 |
| Data Cleaning | 0.7 (High) | 3 |
| Feature Engineering | 0.7 (High) | 3 |
| NumPy | 0.7 (High) | 3 |
| SQL | 0.7 (High) | 3 |
| Linear Algebra | 0.6 (Medium) | 3 |
| Unsupervised Learning | 0.6 (Medium) | 3 |
| Clustering | 0.5 (Medium) | 3 |
| Git | 0.5 (Medium) | 3 |
| Jupyter Notebooks | 0.5 (Medium) | 3 |
| Programming Fundamentals | 0.4 (Low) | 3 |
| Deep Learning | 0.4 (Low) | 2 |
| Natural Language Processing | 0.4 (Low) | 2 |
| Neural Networks | 0.4 (Low) | 2 |

### Machine Learning Engineer — 35 skills

Builds, ships and maintains machine learning systems, from models to deployment.

| Skill | Importance | Required level |
|---|---|---|
| Machine Learning Fundamentals | 1.0 (Very High) | 5 |
| Python | 0.9 (Very High) | 4 |
| Scikit-learn | 0.8 (High) | 4 |
| Statistics | 0.8 (High) | 4 |
| Supervised Learning | 0.8 (High) | 4 |
| Model Evaluation | 0.7 (High) | 4 |
| Neural Networks | 0.7 (High) | 3 |
| Classification | 0.6 (Medium) | 4 |
| Deep Learning | 0.6 (Medium) | 4 |
| Feature Engineering | 0.6 (Medium) | 3 |
| Linear Algebra | 0.6 (Medium) | 3 |
| NumPy | 0.6 (Medium) | 3 |
| Pandas | 0.6 (Medium) | 3 |
| PyTorch | 0.6 (Medium) | 3 |
| Docker | 0.5 (Medium) | 3 |
| Git | 0.5 (Medium) | 3 |
| MLOps | 0.5 (Medium) | 3 |
| Regression | 0.5 (Medium) | 3 |
| SQL | 0.5 (Medium) | 3 |
| Computer Vision | 0.4 (Low) | 3 |
| LLM APIs | 0.4 (Low) | 3 |
| Linux | 0.4 (Low) | 3 |
| Natural Language Processing | 0.4 (Low) | 3 |
| Programming Fundamentals | 0.4 (Low) | 3 |
| Unsupervised Learning | 0.4 (Low) | 3 |
| AWS | 0.4 (Low) | 2 |
| Embeddings | 0.4 (Low) | 2 |
| Retrieval-Augmented Generation | 0.4 (Low) | 2 |
| Cloud Fundamentals | 0.3 (Low) | 2 |
| Clustering | 0.3 (Low) | 2 |
| Command Line | 0.3 (Low) | 2 |
| Prompt Engineering | 0.3 (Low) | 2 |
| TensorFlow | 0.3 (Low) | 2 |
| Vector Databases | 0.3 (Low) | 2 |
| AI Agents | 0.2 (Low) | 2 |

## 3. Demo personas (for the viva)

| Persona | Target | Skills rated | Estimated alignment | Next skills |
|---|---|---|---|---|
| Prabha | Machine Learning Engineer | 16 | 26% | Statistics, Linear Algebra, Pandas |
| Asha | Data Analyst | 5 | 24% | Python, SQL, Statistics |
| Ravi | Full Stack Developer | 24 | 83% | Linux, Relational Database Design, Unit Testing |
| Newbie | none (not onboarded) | 0 | — | — |

## 4. Design choices worth a look

1. **Statistics has no prerequisite** (it is maths). *Machine Learning Fundamentals* requires Python + Statistics + Linear Algebra. The spec's sketch showed Python → Statistics; tell me if you prefer that.
2. **MongoDB and Redis require SQL** ("database basics first"). This is a teaching order, not a technical dependency; it keeps them connected to the graph.
3. **HTTP Fundamentals requires Networking Basics**; REST APIs and Web Security Basics require HTTP; Authentication requires REST APIs + Web Security Basics.
4. **LLM chain:** Prompt Engineering → LLM APIs → Embeddings → Vector Databases → RAG → AI Agents. Only the ML Engineer career includes them (low importance, level 2–3).
5. **Machine Learning Engineer has the longest list (35 skills)** and a beginner's learning path is therefore long. Say so if you want it trimmed.
6. **Prabha's persona scores about 26%**, not the spec's illustrative 63%. The spec number is an example; with a 35-skill career the honest score for a student with 16 skills is lower. Easy to change the persona's skills if you want a friendlier demo.
7. **Not in any career, intentionally:** nothing — every one of the 71 skills is in at least one career.

## 5. How the validator checks quality

No cycles · every prerequisite of a career skill is in that career · prerequisites have required level ≥ 2 · values in range · no duplicates · slugs unique and kebab-case · every career has ≥ 15 skills and one skill at importance 1.0 · longest prerequisite chain ≤ 6 links (actual: 6).
