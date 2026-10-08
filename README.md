# Code Buddy — Cenografia

Aplicação web para configurar stands e gerar scripts Python para Blender.

## Como iniciar no seu computador

1. Extraia o ZIP e abra a pasta `code-buddy` no VS Code.
2. Instale Node.js 22.13 ou superior.
3. No terminal do VS Code, dentro dessa pasta, execute:

```sh
npm install -g pnpm
pnpm install
pnpm dev
```

4. Abra http://localhost:5173 no navegador. Se o terminal indicar outra porta, use a URL que ele mostrar.

## Como usar

Preencha o nome, largura, profundidade e altura em metros. Escolha as paredes, os elementos e a cor. Clique em **Gerar script Blender** e depois em **Baixar .py**.

No Blender, comece com uma cena vazia. Na aba Scripting, abra o arquivo `.py` no editor de texto com Open e clique em Run Script. Use NumPad 0 para olhar pela câmera e F12 para renderizar. A execução substitui apenas a coleção CodeBuddy_Gerado.

## Arquivos principais

- `app/page.tsx`: interface React.
- `app/globals.css`: estilos da aplicação.
- `lib/generator.ts`: regras e geração do Python.
- `exemplos/stand_exemplo.py`: script de exemplo, com stand de 10 × 5 m.

## Escopo da V1

Planta esquemática e geração de modelos conceituais com piso, paredes opcionais, LED, balcão, palco, totem, spots, câmera e render Cycles. O gerador utiliza regras locais e não exige chave de API. A V1 não inclui chat com IA, FreeCAD ou render 3D dentro do navegador.

A compilação da aplicação e a sintaxe de scripts Python foram verificadas. O render ainda precisa ser testado no Blender.

## Compilar

```sh
pnpm build
```

As dependências e os arquivos compilados não estão incluídos; são criados pelos comandos acima.
