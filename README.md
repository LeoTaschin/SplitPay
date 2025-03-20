# SplitPay

SplitPay é um aplicativo mobile desenvolvido em React Native para gerenciamento de despesas compartilhadas entre amigos e grupos.

## Funcionalidades

- Autenticação de usuários
- Gerenciamento de despesas
- Criação de grupos
- Compartilhamento de despesas
- Interface adaptativa (Light/Dark mode)
- Navegação intuitiva

## Tecnologias Utilizadas

- React Native
- Expo
- Firebase (Authentication)
- Context API
- React Navigation

## Como Executar

1. Clone o repositório:
```bash
git clone https://github.com/LeoTaschin/SplitPay.git
```

2. Instale as dependências:
```bash
cd SplitPay
npm install
```

3. Execute o projeto:
```bash
npm start
```

4. Use o aplicativo Expo Go no seu dispositivo móvel para escanear o QR Code ou execute em um emulador.

## Estrutura do Projeto

```
src/
  ├── components/     # Componentes reutilizáveis
  ├── screens/       # Telas do aplicativo
  ├── context/       # Contextos (Theme, Auth)
  ├── hooks/         # Custom hooks
  ├── config/        # Configurações (Firebase)
  └── assets/        # Recursos estáticos
```

## Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 