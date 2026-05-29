from flask import Flask, request, render_template, jsonify, redirect
from crit import *
#TODO
#Make sure when user removes file the text for it removes as well. - DONE!
#Change name
app = Flask(__name__)

@app.route("/api/critique", methods=["POST"])
def critique():

    file = request.files.get("file")

    resume_text = request.form.get("resume_text")

    role = request.form.get("role")

    # 1. Extract text
    text = ""
    if file:

        text = extract_text(file)  # pdf/docx/txt parser
    elif resume_text:

        text = resume_text
    # 2. Run your AI / rules / LLM
    result = analyze_resume(text, role)
    # 3. Return EXACT schema JS expects
    #print(result)
    return result
    '''return {
        "score": 0 - 100,
        "summary": "...",
        "strengths": ["random"],
        "improvements": [],
        "sections": [
            {
                "name": "Experience",
                "score": 0 - 100,
                "feedback": "..."
            }
        ]
    }'''

@app.route("/")
def main_page():
    return render_template("index.html")

'''@app.route("/", methods=['POST'])
def process_data():
    data = request.get_json()
    js_variable = data.get('data')

    return jsonify(status="success", received=js_variable)'''

if __name__ == '__main__':
    app.run(debug=True)
