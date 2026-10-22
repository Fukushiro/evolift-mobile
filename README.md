# Evolift App

Aplicativo de treinos feito com Expo, React Native e Expo Router. O app funciona sem login e sem conexão com uma API: os treinos e o progresso das séries ficam salvos localmente no dispositivo por meio do AsyncStorage.

## Funcionalidades

- Criação e edição local de treinos, com organização de exercícios, séries e execuções.
- Catálogo estático de exercícios em [`src/constants/exercicios.ts`](./src/constants/exercicios.ts), com ID, nome e vídeo.
- Detalhes do treino com registro de séries concluídas, cronômetro de descanso, acesso aos vídeos e limpeza do progresso.
- Restauração dos treinos e do progresso ao reabrir o aplicativo.
- Banner adaptativo do AdMob fixo no rodapé das telas nativas.

## Executar

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

O catálogo de exercícios é editado diretamente em `src/constants/exercicios.ts`. Os treinos que cada pessoa cria e o progresso registrado não são enviados a nenhum servidor; eles permanecem apenas no armazenamento local do aplicativo.

## AdMob

Os perfis `development` e `preview` usam anúncios de teste do Google. Para produção, cadastre no ambiente `production` do projeto EAS os quatro IDs da sua conta AdMob:

- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`
- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID`
- `EXPO_PUBLIC_ADMOB_BANNER_ID_IOS`

Esses IDs são públicos e devem ser configurados como variáveis `EXPO_PUBLIC_` no EAS. Para desenvolvimento local, use `.env.local`. Um build no perfil `production` falha com a lista das variáveis ausentes, em vez de publicar usando IDs de teste ou sem banner.

O consentimento UMP é coletado antes da inicialização do SDK. Configure as mensagens de privacidade e a política de privacidade na conta AdMob. Alterações nos App IDs exigem um novo build nativo.

O SDK do AdMob não funciona no Expo Go. Para desenvolvimento, use um development build. Para publicar Android, gere com `npx eas-cli build --profile production --platform android`; para iOS, use `npx eas-cli build --profile production --platform ios`. Os dados dos treinos continuam locais; somente os anúncios fazem solicitações externas.

## Verificações

```bash
npx expo lint
npx tsc --noEmit
```
