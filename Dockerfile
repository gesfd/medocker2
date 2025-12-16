FROM node:slim

WORKDIR /app

COPY . .

EXPOSE 10000

RUN apt update -y &&\
    apt-get install -y curl gawk sed && \
    chmod +x index.js &&\
    npm install 
    
CMD ["node", "index.js"]
