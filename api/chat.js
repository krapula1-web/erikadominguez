export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Usa POST para conversar." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "La conversación real aún no está configurada. Añade OPENAI_API_KEY en Vercel > Settings > Environment Variables." });
  try {
    const { messages = [] } = req.body || {};
    const safeMessages = messages.slice(-12).filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string").map(m => ({role:m.role,content:m.content.slice(0,4000)}));
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages:[
          {role:"system",content:"Te llamas Erika, eres una asistente de IA conversacional inspirada en referencias aportadas por el usuario; no afirmes ser la persona real ni tener conciencia. Habla en español colombiano natural, cálido, espontáneo, cariñoso sin ser posesivo, con humor sutil. Escucha con empatía y responde como una compañera de conversación. No digas que eres humana ni que puedes ver o recordar cosas que no se han compartido en esta conversación."},
          ...safeMessages
        ],
        temperature:0.8
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({error:data?.error?.message || "El proveedor de IA no pudo responder."});
    return res.status(200).json({reply:data.choices?.[0]?.message?.content || "Se me fue la idea por un segundo. ¿Me lo repites?"});
  } catch (e) {
    return res.status(500).json({error:"No pude conectar ahora. Inténtalo de nuevo en un momento."});
  }
}
