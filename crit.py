from openai import OpenAI
import os
from docx import Document
import pdfplumber
import sys

def analyze_resume(text, role=""):
    api_key = os.getenv("openaikey")
    client = OpenAI(api_key=api_key)
    with open("prompt.txt", "r") as f:
        system_prompt = f.read()
    chatty_response = client.responses.create(
        model="gpt-4o-mini",
        temperature=0.3,
        input=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"""
    Resume:
    {text}

    Target Role:
    {role}
    """
            }
        ]
    )

    return chatty_response.output[0].content[0].text

def extract_text(file):
    filename = file.filename.lower()

    if filename.endswith(".txt"):
        return file.read().decode("utf-8", errors="ignore")

    elif filename.endswith(".pdf"):
        with pdfplumber.open(file) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)

    elif filename.endswith(".docx"):
        doc = Document(file)
        return "\n".join(p.text for p in doc.paragraphs)

    else:
        raise ValueError("Unsupported file type")

if __name__ == "__main__":
    #print(extract_text("test.txt"))

    '''with open("resume.txt","r") as f:
        text = f.read()
    res = analyze_resume(text)
    print(res.output[0].content[0].text)'''