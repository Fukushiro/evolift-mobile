# Evolift App

Aplicativo de treinos feito com Expo, React Native e Expo Router. O app funciona sem login e sem conexão com uma API: os treinos e o progresso das séries ficam salvos localmente no dispositivo por meio do AsyncStorage.

## Funcionalidades

- Criação e edição local de treinos, com organização de exercícios, séries e execuções.
- Catálogo estático de exercícios em [`src/constants/exercicios.ts`](./src/constants/exercicios.ts), com ID, nome e vídeo.
- Detalhes do treino com registro de séries concluídas, cronômetro de descanso, acesso aos vídeos e limpeza do progresso.
- Restauração dos treinos e do progresso ao reabrir o aplicativo.
- Exportação de backup com todos os treinos e progresso das séries, copiado para a área de transferência.
- Importação de backup completo com confirmação, substituindo treinos e progresso locais.
- Banner adaptativo do AdMob fixo no rodapé das telas nativas.

## Executar

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

O catálogo de exercícios é editado diretamente em `src/constants/exercicios.ts`. Os treinos que cada pessoa cria e o progresso registrado não são enviados a nenhum servidor; eles permanecem apenas no armazenamento local do aplicativo.

Na tela inicial, toque em **Exportar todos os dados** para copiar um código de backup com todos os treinos, configurações dos exercícios e progresso das séries. Para restaurá-lo, cole o código no campo de importação de backup completo. A confirmação substitui os treinos e o progresso atualmente salvos no dispositivo.

## AdMob

O perfil `development` usa anúncios de teste do Google. Os perfis `preview` e `production` usam os IDs reais do AdMob configurados nos respectivos ambientes do EAS. Enquanto o consentimento é verificado ou o banner não pode ser carregado, o app mantém um espaço reservado visível no rodapé. Não clique nos anúncios reais durante testes; use o perfil `development` para testar com anúncios de teste.

- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`
- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID`
- `EXPO_PUBLIC_ADMOB_BANNER_ID_IOS`

Esses IDs são públicos e devem ser configurados como variáveis `EXPO_PUBLIC_` no EAS. Para desenvolvimento local, use `.env.local`. Um build no perfil `production` falha com a lista das variáveis ausentes, em vez de publicar usando IDs de teste ou sem banner.

O consentimento UMP é coletado antes da inicialização do SDK. Configure as mensagens de privacidade e a política de privacidade na conta AdMob. Alterações nos App IDs exigem um novo build nativo.

O app pode ser aberto no celular com `npx expo start` e Expo Go, mas o Expo Go não inclui o módulo nativo do AdMob; nesse caso, o rodapé informa que os anúncios precisam de um APK development. Para testar anúncios de teste, instale o development build e inicie o servidor com `npx expo start --dev-client`. Para publicar Android, gere com `npx eas-cli build --profile production --platform android`; para iOS, use `npx eas-cli build --profile production --platform ios`. Os dados dos treinos continuam locais; somente os anúncios fazem solicitações externas.

## Verificações

```bash
npx expo lint
npx tsc --noEmit
```
