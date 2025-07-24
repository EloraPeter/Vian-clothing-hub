FROM denoland/deno:1.46.3

RUN apt-get update && apt-get install -y \
    latexmk \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
CMD ["deno", "run", "--allow-all", "index.ts"]
