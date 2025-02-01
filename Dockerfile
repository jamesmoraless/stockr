# Backend (Flask)
FROM python:3.9
WORKDIR /server
COPY server/ .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]

# Frontend (Next.js)
FROM node:18
WORKDIR /client
COPY client/ .
RUN npm install
CMD ["npm", "run", "dev"]
