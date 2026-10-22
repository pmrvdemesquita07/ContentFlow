# Newsletter no Fim da Página (plugin WordPress)

Bloco de subscrição de newsletter, a toda a largura, inserido automaticamente no fim de cada página, com o logo em marca de água à direita.

## Instalar

1. Comprime a pasta `newsletter-fim-de-pagina` num `.zip` (ou usa o `.zip` já gerado).
2. WordPress → **Plugins → Adicionar novo → Carregar plugin** → escolhe o `.zip` → **Ativar**.
3. Vai a **Newsletter → Definições**.

## Configurar

- **Logo (marca de água):** o logo Public' já vem incluído (`assets/logo.png`). Para trocar, carrega um PNG transparente ou um SVG. O logo é pintado numa única cor (a "cor da marca de água"), por isso as cores originais não importam.
- **Onde aparece:** escolhe páginas e/ou artigos; podes excluir páginas pelo ID (ex.: Contactos, Checkout).
- **Cores e textos:** fundo, texto/botão, marca de água, título, descrição, texto do botão, consentimento RGPD.
- **Plataforma de email (opcional):** Brevo ou Mailchimp. Os subscritores ficam sempre também guardados em **Newsletter → Subscritores**, com exportação para CSV.

Para pôr o formulário noutro sítio (ex.: rodapé do Elementor), usa o shortcode `[newsletter]`.

## Notas

- Proteção anti-spam: campo-armadilha invisível + limite de 5 tentativas por IP a cada 10 minutos. Não usa nonce de propósito, para funcionar com plugins de cache de páginas.
- O formulário funciona sem JavaScript (recarrega a página com a mensagem); com JavaScript submete sem recarregar.
- Desativar o plugin não apaga os subscritores.
