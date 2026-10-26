# Build local da Vercel no Windows

## Correção do EPERM no empacotamento

Durante a cópia das dependências pelo Nitro/nf3, algumas criações de diretório falhavam temporariamente com EPERM. O diagnóstico registrou o diretório ainda inexistente e seu pai acessível; repetir a operação após 100 ms permitiu concluir o build.

A correção está em `patches/nf3@0.3.24.patch`, aplicada automaticamente pelo pnpm e registrada em `pnpm-workspace.yaml` e `pnpm-lock.yaml`. Não é uma alteração manual descartável em node_modules.

O patch mantém o comportamento original fora do Windows. No Windows, somente EPERM e EBUSY na criação das pastas de dependências recebem até três novas tentativas, após 100, 200 e 400 ms. Se o erro persistir, ele é propagado e o build falha. Não muda ACLs, não solicita privilégios de administrador e não omite dependências da saída.

Use pnpm para instalar este projeto; a aplicação do patch depende dele. Ao atualizar o nf3, revise se a correção ainda é necessária e compatível com a nova versão.

## Executar no PowerShell

```powershell
pnpm install --frozen-lockfile
node --test tests/windows-build-mkdir.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
$env:VERCEL = '1'
pnpm build
```

Esses comandos apenas compilam. Não fazem deploy.

## Verificações

Os testes exercitam a função do nf3 efetivamente instalada: sucesso imediato, recuperação de EPERM e EBUSY, limite de tentativas, propagação de EACCES/ENOSPC/ENOENT e comportamento original fora do Windows.

A saída esperada inclui `.vercel/output/config.json`, arquivos estáticos e a função `.vercel/output/functions/__server.func/index.mjs`, com sua configuração de runtime. O aviso do Vinext sobre classificação estática desconhecida da rota `/` é uma limitação informativa do framework, não uma falha do empacotamento.

Um build feito no Windows valida o empacotamento local. Para publicação, a Vercel deve recompilar a partir do código e do lockfile no ambiente dela, especialmente por causa das dependências nativas. Nenhuma publicação faz parte desta correção.

## Resultado da validação local

- Dois builds Vercel consecutivos concluídos com código de saída 0, sem o módulo temporário de diagnóstico.
- Instalação com lockfile congelado aprovada, incluindo as políticas de dependências do pnpm.
- Oito testes de regressão aprovados.
- Checagem TypeScript sem erros.
- Configuração Build Output API v3 e função Node.js 24 geradas.
- A função empacotada foi importada diretamente e respondeu HTTP 200 para `/`, com HTML da aplicação.
- Sem commit, push ou deploy.
