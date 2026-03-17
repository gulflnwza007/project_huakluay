const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("ใส่_API_KEY_ของนาย");

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, can you hear me?");
        console.log("AI ตอบว่า:", result.response.text());
    } catch (error) {
        console.error("ยังพังอยู่เพราะ:", error.message);
    }
}
test();