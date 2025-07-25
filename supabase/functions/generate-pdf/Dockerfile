FROM denoland/deno:1.46.3
RUN apt-get clean && rm -rf /var/lib/apt/lists/* \
    && for i in 1 2 3; do apt-get update --fix-missing && break || sleep 5; done \
    && for i in 1 2 3; do apt-get install -y --no-install-recommends \
        latexmk \
        texlive-latex-base \
        texlive-latex-extra \
        && break || sleep 5; done \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY index.ts Invoice.tex Receipt.tex logo.png ./
CMD ["deno", "run", "--allow-net", "--allow-read=/app,/tmp", "--allow-write=/app,/tmp", "--allow-run=latexmk", "index.ts"]