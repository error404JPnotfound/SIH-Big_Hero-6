export const sendEmailOtp = async (toEmail, otp) => {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY
  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'no-reply@careconnect.com'
  const senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'CareConnect'

  if (!apiKey) {
    throw new Error('Brevo API key is not configured.')
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject: 'Your CareConnect OTP',
    htmlContent: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>CareConnect Login OTP</h2>
        <p>Your One-Time Password for login is:</p>
        <h1 style="color: #0F9D8A; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Brevo Error:', errorData)
    throw new Error(errorData.message || 'Failed to send OTP email.')
  }

  return await response.json()
}
