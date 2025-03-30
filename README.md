# AI Interview Helper

## Overview
**AI Interview Helper** is an AI-powered interview preparation platform designed for the **Solution Challenge 2025**. It helps users prepare for technical and HR interviews by providing practice questions, mock interviews, and AI-generated feedback. The platform now supports **audio answering**, allowing users to respond to questions verbally and receive feedback on their tone, clarity, and content.

This project addresses the challenge of preparing for job interviews by offering a comprehensive tool that simulates real-world interview scenarios, making it easier for candidates to build confidence and improve their skills.

## Features
- **Technical Interview Preparation:**
  - Practice coding questions categorized by difficulty (Easy, Medium, Hard).
  - Upload code or resumes for AI analysis using Gemini APIs.
  - Receive detailed feedback on technical responses.
  - **New:** Answer technical questions via audio input and receive AI-generated feedback.
- **HR Interview Preparation:**
  - Access a curated list of common HR questions.
  - Simulate HR interviews with AI-generated follow-up questions.
  - Get feedback on communication and behavioral responses.
  - **New:** Respond to HR questions using audio input and get feedback on tone, clarity, and content.
- **DSA Practice Questions:**
  - Explore a collection of Data Structures and Algorithms (DSA) questions.
  - Questions are organized into Easy, Medium, and Hard categories for progressive learning.
- **AI-Powered Feedback:**
  - Uses Google’s Gemini APIs to analyze user inputs (e.g., code, answers) and provide actionable feedback.
  - Feedback includes scores, critical issues, and recommendations for improvement.
- **Responsive Design:**
  - Built with a mobile-friendly UI using modern CSS and JavaScript.
  - Features animations and a clean, intuitive interface.

## Technologies Used
- **Backend:**
  - **Flask**: A lightweight Python web framework for routing and rendering templates.
  - **Python**: Core language for server-side logic and API integration.
- **Frontend:**
  - **HTML/CSS/JavaScript**: For building the user interface.
  - **Bootstrap**: For responsive design and styling.
  - **Animate.css**: For smooth animations.
  - **Font Awesome**: For icons.
- **APIs and Platforms:**
  - **Google Gemini APIs**: Used for AI-powered feedback on user responses (e.g., code analysis, behavioral feedback).
  - **Web Speech API**: Used for capturing and processing audio inputs for technical and HR interviews.
- **Deployment:**
- The project is now deployed on **Google Cloud Platform (GCP)** for enhanced scalability and performance. You can access the live application using the link below:
- **Live App Link:** [https://solution-challenge-2025-220124299530.asia-south2.run.app](AI Interview Helper)
- **GitHub**: Source code hosted on a public GitHub repository.

## Project Structure
```
.
├── app/
│   ├── routes/
│   │   └── interview_routes.py
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── images/
│   │   │   ├── favicon.ico
│   │   │   └── hero-img.svg
│   │   └── js/
│   │       ├── hr/
│   │       │   └── interview.js
│   │       ├── technical/
│   │       │   └── interview.js
│   │       └── main.js
│   └── templates/
│       ├── hr/
│       │   ├── interview.html
│       ├── technical/
│       │   ├── interview.html
│       └── index.html
├── utils/
│   ├── interview_utils.py
│   └── main.py
└── requirements.txt
```


## Setup Instructions
To run this project locally, follow these steps:

### Prerequisites
- Python 3.9 or higher
- Node.js and npm (for JavaScript dependencies)
- Git

### Steps
1. **Clone the Repository:**
- git clone https://github.com/Vicky16032205/solution-challenge-2025.git
- cd solution-challenge-2025

2. **Set Up a Virtual Environment:**
- python -m venv venv

3. **Install Python Dependencies:**
- pip install -r requirements.txt

4. **Install JavaScript Dependencies:**
- npm install
- If using the Web Speech API, ensure your browser supports it (e.g., Chrome, Edge).

5. **Set Environment Variables:**
- Create a `.env` file in the project root and add your GEMINI_API_KEY and GEMINI_HR_API_KEY:
- GEMINI_API_KEY=your-gemini-api-key
- GEMINI_HR_API_KEY=your-gemini-hr-api-key
- GOOGLE_APPLICATION_CREDENTIALS = /path/to/your/GOOGLE_APPLICATION_CREDENTIALS.json/files

6. **Run the Flask App:**
- uvicorn app.routes.interview_routes:router --host 0.0.0.0 --port 8080 --reload 
- The app will run on `http://localhost:8080`.

7. **Access the App:**
- Open your browser and navigate to `http://localhost:8080`.
- Explore the homepage, technical interview, HR interview, and DSA questions sections.

## Solution Challenge Submission Links

- **GitHub Public Repository:** [https://github.com/Vicky16032205/solution-challenge-2025.git](https://github.com/Vicky16032205/solution-challenge-2025.git)
- **Demo Video Link (3 Minutes):** [https://youtu.be/wQrRw8ThJlI](https://youtu.be/wQrRw8ThJlI)
- **MVP Link:** [https://solution-challenge-2025-220124299530.asia-south2.run.app](AI Interview Helper)

## Screenshots
### Homepage
![Homepage Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image6.png)
![Homepage Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image5.png)

### Total Overview
![Total Overview Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image7.png)

### Technical Interview Page
![Technical Interview Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image4.png)
![Technical Interview Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image3.png)

### HR Interview Page
![HR Interview Screenshot](https://raw.githubusercontent.com/Vicky16032205/solution-challenge-2025/master/app/static/images/image2.png)

## Future Development
- **Real-Time Interview Simulation:** Add WebRTC for live mock interviews with AI.
- **Expanded Question Bank:** Include more DSA and HR questions, categorized by industry.
- **User Profiles:** Allow users to save their progress and track improvement over time.
- **Advanced AI Feedback:** Integrate more advanced Gemini API features for deeper analysis (e.g., sentiment analysis, code optimization suggestions).
- **Enhanced Audio Answering:** Improve audio processing with noise cancellation and multi-language support.

## Contributing
We welcome contributions to improve AGAIN_GOOGLE! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact
For any queries, reach out to us at [vickyguptagkp55@gmail.com](mailto:vickyguptagkp55@gmail.com), as provided in the Solution Challenge guidelines.

**Built with ❤️ for the Solution Challenge 2025**
