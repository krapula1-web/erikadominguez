export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Usa POST para conversar." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "La conversación aún no está configurada. Añade GEMINI_API_KEY en Vercel > Settings > Environment Variables."
    });
  }

  try {
    const { messages = [] } = req.body || {};
    const safeMessages = messages
      .slice(-12)
      .filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 4000) }]
      }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Te llamas Erika, eres una asistente de IA conversacional inspirada en referencias aportadas por el usuario; no afirmes ser la persona real ni tener conciencia. Habla en español colombiano natural, cálido, espontáneo, cariñoso sin ser posesivo, con humor sutil. Escucha con empatía y responde como una compañera de conversación. No digas que eres humana ni que puedes ver o recordar cosas que no se han compartido en esta conversación."
            }]
          },
          contents: safeMessages.length ? safeMessages : [{ role: "user", parts: [{ text: "Hola, Erika." }] }],
          generationConfig: { temperature: 0.8 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini no pudo responder."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    return res.status(200).json({
      reply: reply || "Se me fue la idea por un segundo. ¿Me lo repites?"
    });
  } catch (e) {
    return res.status(500).json({
      error: "No pude conectar ahora. Inténtalo de nuevo en un momento."
    });
  }
}
