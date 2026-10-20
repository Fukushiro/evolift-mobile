# Evolift App

Aplicativo de treinos feito com Expo, React Native e Expo Router. O app funciona sem login e sem conexão com uma API: os treinos e o progresso das séries ficam salvos localmente no dispositivo por meio do AsyncStorage.

## Funcionalidades

- Criação e edição local de treinos, com organização de exercícios, séries e execuções.
- Catálogo estático de exercícios em [`src/constants/exercicios.ts`](./src/constants/exercicios.ts), com ID, nome e vídeo.
- Detalhes do treino com registro de séries concluídas, cronômetro de descanso, acesso aos vídeos e limpeza do progresso.
- Restauração dos treinos e do progresso ao reabrir o aplicativo.

## Executar

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

O catálogo de exercícios é editado diretamente em `src/constants/exercicios.ts`. Os treinos que cada pessoa cria e o progresso registrado não são enviados a nenhum servidor; eles permanecem apenas no armazenamento local do aplicativo.

## Verificações

```bash
npx expo lint
npx tsc --noEmit
```
