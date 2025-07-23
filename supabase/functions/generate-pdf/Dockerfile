FROM denoland/deno:1.46.3
RUN apt-get update && apt-get install -y latexmk texlive-full
WORKDIR /app
COPY . .
CMD ["deno", "run", "--allow-all", "index.ts"]