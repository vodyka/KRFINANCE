export const emailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px;">
    ${content}
  </div>
</body>
</html>
`;

export const emailHeader = (title: string) => `
<div style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e4e4e7;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    <div>
      <div style="font-size: 20px; font-weight: 700; color: #18181b;">Kryzer Finanças</div>
    </div>
  </div>
  <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">${title}</h1>
</div>
`;

export const emailBody = (content: string) => `
<div style="padding: 32px 40px;">
  ${content}
</div>
`;

export const emailButton = (text: string, url: string) => `
<a href="${url}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 6px;">${text}</a>
`;

export const emailFooter = (text: string) => `
<div style="padding: 24px 40px; border-top: 1px solid #e4e4e7;">
  <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">${text}</p>
</div>
`;

export const welcomeEmail = (userName: string, trialEndsAt: string) => {
  const formattedDate = new Date(trialEndsAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return emailTemplate(`
    ${emailHeader(`Bem-vindo ao Kryzer Finanças!`)}
    ${emailBody(`
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #3f3f46;">
        Olá <strong>${userName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #3f3f46;">
        Seu cadastro foi realizado com sucesso! Estamos muito felizes em tê-lo conosco.
      </p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #667eea; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #18181b;">
          🎉 Período de Avaliação Gratuito
        </p>
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #3f3f46;">
          Você ganhou <strong>30 dias de acesso completo</strong> para explorar todos os recursos do sistema.
          Seu período de avaliação termina em <strong>${formattedDate}</strong>.
        </p>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #3f3f46;">
        Com o Kryzer Finanças você pode:
      </p>
      <ul style="margin: 0 0 24px 0; padding-left: 24px; font-size: 15px; line-height: 24px; color: #3f3f46;">
        <li>Gerenciar lançamentos financeiros</li>
        <li>Acompanhar extratos e saldos</li>
        <li>Controlar contas bancárias</li>
        <li>Organizar categorias e centros de custo</li>
        <li>Cadastrar clientes e fornecedores</li>
        <li>Visualizar dashboards e relatórios</li>
      </ul>
      ${emailButton("Acessar o Sistema", "https://getmocha.com")}
      <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #71717a;">
        Se você tiver alguma dúvida ou precisar de ajuda, não hesite em nos contatar.
      </p>
    `)}
    ${emailFooter("© 2025 Kryzer Finanças. Todos os direitos reservados.")}
  `);
};
