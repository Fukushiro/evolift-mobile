# Evolift App

Aplicativo do Evolift feito com Expo, React Native e Expo Router. O estado do usuário autenticado fica no Redux; as credenciais usadas para restaurar a sessão são guardadas no SecureStore em iOS e Android e no armazenamento local do navegador em web.

O progresso das séries de cada exercício também fica no Redux e é persistido localmente, para continuar disponível ao reabrir o app. Na tela de detalhes do treino, use “Limpar séries” para zerar as contagens daquele treino.

## Funcionalidades

- Login, cadastro e saída da conta.
- Listagem, criação, edição e consulta de treinos, incluindo ordenação dos exercícios, séries e execuções.
- Detalhes do treino com registro de séries concluídas, cronômetro de descanso, acesso aos vídeos e limpeza do progresso.
- Para usuários administradores: listagem paginada, cadastro, edição e exclusão de exercícios, com URL de vídeo opcional.

## Executar

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

O app se conecta à API de autenticação e treinos na URL definida em `EXPO_PUBLIC_API_BASE_URL`. O padrão é `http://localhost:8080`.

- Android Emulator: use `http://10.0.2.2:8080` para alcançar o servidor executado no computador.
- iOS Simulator: `http://localhost:8080` normalmente alcança o computador host.
- Dispositivo físico: informe o endereço IP local do computador na rede Wi-Fi, por exemplo `http://192.168.1.20:8080`.

Exemplo no PowerShell, antes de iniciar o Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:8080"
npx expo start
```

O login permanece ativo ao fechar e reabrir o app. Em web, a sessão é persistida no armazenamento local do navegador; sair da conta remove os dados salvos. Como o navegador não oferece o SecureStore nativo, use esse modo apenas em dispositivos confiáveis.

## Verificações

```bash
npx expo lint
npx tsc --noEmit
```
