import streamlit as st
import io
from datetime import datetime
import pandas as pd
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Inches
from fpdf import FPDF

# ==========================================
# 1. THE LEGAL DATA DICTIONARY
# ==========================================
# This acts as the logic engine's brain, containing the high-fidelity legal text.

BASE_POLICY = {
    "1. PURPOSE": "This Acceptable Use Policy (“Policy”) establishes the foundational standards for the acceptable, safe, and lawful use of {company_name} information systems, networks, devices, and data. This Policy is intended to protect the confidentiality, integrity, and availability of Company information, define acceptable and prohibited behaviors, and reduce legal, operational, and cybersecurity risk.",
    "2. SCOPE": "This Policy applies to all employees, independent contractors, vendors, and third-party affiliates (“Users”) utilizing {company_name}-owned or managed systems, devices, networks, and data. It extends to any personal devices utilized to access Company infrastructure under an approved Bring Your Own Device (BYOD) framework.",
    "3. USER RESPONSIBILITIES": "Users bear the primary responsibility for maintaining the security of {company_name} resources. Users must utilize Company resources exclusively for authorized business purposes, safeguard all credentials and sensitive organizational information, and comply with all applicable local, state, and federal regulations. Any suspected security incident, breach, or violation of this Policy must be immediately reported to {security_contact}.",
    "8. MONITORING AND PRIVACY": "To ensure compliance, security, and operational efficiency, {company_name} explicitly reserves the right to monitor, log, and audit all system usage, network traffic, and data stored on Company systems at any time, without prior notice. Users shall have no expectation of privacy regarding their use of Company IT resources, networks, or communications platforms.",
    "9. ENFORCEMENT & DISCIPLINARY ACTION": "Violations of this Policy represent a serious breach of organizational trust and security. Depending on the severity of the infraction, violations may result in immediate suspension or termination of network access, formal disciplinary action up to and including termination of employment or contract, and civil or criminal legal action where applicable.",
    "10. INCIDENT REPORTING": "Users are required to report any unauthorized access, loss of hardware, suspected phishing attempts, or known policy violations within 24 hours of discovery. All reports must be submitted directly to {security_contact}.",
    "11. ACKNOWLEDGMENT": "By accessing {company_name} systems, the User acknowledges that they have read, comprehended, and agreed to comply strictly with all requirements outlined in this Acceptable Use Policy."
}

TIERED_POLICY = {
    "4. CORE IT RULES": {
        "Flexible": "Users are permitted limited, reasonable personal use of Company networks and devices, provided such use does not interfere with daily business operations, consume excessive network bandwidth, or violate applicable laws. Users may download software required for their roles with informal managerial approval.",
        "Standard": "Company-provided IT resources are strictly intended for business purposes. While incidental personal use is tolerated, it must not impact productivity or introduce security risks. Users must lock devices when unattended. Only authorized, commercially vetted software on the approved software list may be installed.",
        "High-Security": "All IT resources, networks, and hardware are restricted exclusively to authorized business operations. Zero personal use is permitted. Users must operate within a Zero-Trust framework. Installation of unapproved software, circumventing endpoint management, or unauthorized external data transfers will result in immediate network revocation."
    },
    "5. GENERATIVE AI USAGE": {
        "Flexible": "Users are permitted to utilize public Generative AI tools (e.g., ChatGPT, Claude) for brainstorming, drafting non-sensitive content, and general research. Users must not input Highly Confidential data into public AI models. Outputs must be reasonably reviewed before business application.",
        "Standard": "Users may only utilize Generative AI platforms explicitly approved by {company_name} IT operations. Under no circumstances may protected, proprietary, or regulated client data be entered into an AI prompt. All AI-generated content must be validated for accuracy and cannot be represented as verified human-generated fact.",
        "High-Security": "The use of public or unsanctioned Generative AI tools is strictly prohibited. AI usage is limited entirely to Enterprise-approved, secure-enclave instances where data is not utilized to train external models. Strict data classification rules apply, and all AI queries are subject to continuous logging and auditing."
    },
    "6. REMOTE WORK / VPN": {
        "Flexible": "Users operating remotely are encouraged to utilize secure, private Wi-Fi networks. The use of a Virtual Private Network (VPN) is recommended when accessing sensitive company documents or internal servers.",
        "Standard": "Users accessing {company_name} infrastructure from remote locations must connect via the approved Company VPN. Multi-Factor Authentication (MFA) is strictly enforced for all remote access points. Public Wi-Fi usage is prohibited unless operating through the secure VPN tunnel.",
        "High-Security": "Remote access to {company_name} systems is heavily restricted and monitored. Users must utilize only Company-issued, managed hardware connecting via an always-on Enterprise VPN. Continuous endpoint detection and response (EDR) agents must remain active at all times during remote sessions."
    },
    "7. PERSONAL DEVICE / BYOD": {
        "Flexible": "Users may utilize personal devices (smartphones, tablets) to access Company email and communication platforms, provided the device maintains basic security controls, including a complex passcode and active biometric locks.",
        "Standard": "The use of personal devices to access {company_name} data requires formal device registration. Users must consent to the installation of Mobile Device Management (MDM) profiles to separate business and personal data. The Company reserves the right to remotely wipe business data from the personal device if lost or compromised.",
        "High-Security": "Bring Your Own Device (BYOD) is strictly prohibited. Company data, communications, and networks may only be accessed utilizing heavily managed, Company-issued hardware. Transferring Company data to personal devices, personal cloud storage, or personal email accounts is a severe security violation."
    }
}

# ==========================================
# 2. PDF TEXT SANITIZATION (Times core font / Latin-1)
# ==========================================
def sanitize_text(text: str) -> str:
    """Replace Unicode punctuation so FPDF core fonts accept the string."""
    s = text if isinstance(text, str) else str(text)
    return (
        s.replace("\u201c", '"')  # “
        .replace("\u201d", '"')  # ”
        .replace("\u2018", "'")  # ‘
        .replace("\u2019", "'")  # ’
        .replace("\u2014", "-")  # —
    )


# ==========================================
# 3. PDF GENERATOR CLASS (Legal Formatting)
# ==========================================
class LegalPDF(FPDF):
    def __init__(self, company_name):
        super().__init__()
        self.company_name = company_name

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font("Times", "I", 9)
        # The Custom Mojo Footer
        footer_text = f"Proprietary & Confidential | Prepared for {self.company_name} by SOP Mojo's AUP Engine."
        self.cell(0, 10, sanitize_text(footer_text), align="C")
# ==========================================
# 3. STREAMLIT UI & LOGIC
# ==========================================
st.set_page_config(page_title="SOP Mojo | AUP Engine", page_icon="⚡", layout="wide")

# Live token source (published Google Sheet)
SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRrHS44BtJEmfCFcYEsfAs7V88mxrK5KVLVBSLxe-tUl84Y26DUjrHiusjundmCdAVDAYccTtdJSmpx/pubhtml"
SHEET_URL = SHEET_URL.strip().replace("/pubhtml", "/pub?output=csv")
orders_df = pd.read_csv(SHEET_URL, dtype=str)
VALID_TOKENS = (
    orders_df["Order ID"]
    .dropna()
    .str.replace(r'\.0$', '', regex=True)
    .str.strip()
    .tolist()
)
token_param = st.query_params.get("token")
provided_token = token_param[0] if isinstance(token_param, list) and token_param else token_param
provided_token = str(provided_token) if provided_token is not None else ""

if provided_token not in VALID_TOKENS:
    st.error("🛑 Access Denied: Invalid or missing authorization token.")
    st.markdown("[Purchase Access Here](https://samcart.com)")
    st.stop()

# Custom CSS to force the neon green text to be black for readability on buttons
st.markdown("""
    <style>
    div.stDownloadButton > button {
        color: #000000 !important;
        font-weight: 700 !important;
        border: none !important;
    }
    div.stDownloadButton > button:hover {
        opacity: 0.8;
    }
    [data-testid="collapsedControl"] {
        color: #b0ff56 !important;
    }
    [data-testid="collapsedControl"] svg {
        fill: #b0ff56 !important;
        color: #b0ff56 !important;
        stroke: #b0ff56 !important;
    }
    </style>
""", unsafe_allow_html=True)

# Layout for Logo and Title
col_logo, col_title = st.columns([1, 8])
with col_logo:
    try:
        # Tries to load the logo if it exists in the folder
        st.image("logo.png", use_container_width=True)
    except:
        st.info("Logo Placeholder")

with col_title:
    st.title("Acceptable Use Policy (AUP) Engine")
    
st.markdown("Generate a legal-grade, custom Acceptable Use Policy for your organization in seconds. Select your compliance tiers and download a highly formatted document ready for signature.")

st.title("⚖️ Acceptable Use Policy (AUP) Engine")
st.markdown("Generate a legal-grade, custom Acceptable Use Policy for your organization in seconds. Select your compliance tiers and download a highly formatted document ready for signature.")

# Sidebar for Variables
with st.sidebar:
    st.header("🏢 Company Information")
    company_name = st.text_input("Legal Company Name", value="Acme Corp LLC")
    short_name = st.text_input("Short Name", value="")
    industry = st.text_input("Industry", value="Financial Services")
    policy_owner = st.text_input("Policy Owner (Name/Title)", value="Director of IT")
    security_contact = st.text_input("Security Contact Email", value="security@acmecorp.com")
    effective_date = st.date_input("Effective Date", value=datetime.today())

st.header("🛡️ Security & Compliance Tiers")
col1, col2 = st.columns(2)

with col1:
    core_tier = st.selectbox("1. Core IT Rules Tier", options=["Flexible", "Standard", "High-Security"], index=1)
    ai_tier = st.selectbox("2. Generative AI Usage Tier", options=["Flexible", "Standard", "High-Security"], index=1)

with col2:
    remote_tier = st.selectbox("3. Remote Work / VPN Tier", options=["Flexible", "Standard", "High-Security"], index=1)
    byod_tier = st.selectbox("4. Personal Device (BYOD) Tier", options=["Flexible", "Standard", "High-Security"], index=1)

# Function to compile the final text
def compile_policy():
    compiled_text = {}
    
    # Add Base sections 1-3
    compiled_text["1. PURPOSE"] = BASE_POLICY["1. PURPOSE"].format(company_name=company_name)
    compiled_text["2. SCOPE"] = BASE_POLICY["2. SCOPE"].format(company_name=company_name)
    compiled_text["3. USER RESPONSIBILITIES"] = BASE_POLICY["3. USER RESPONSIBILITIES"].format(company_name=company_name, security_contact=security_contact)
    
    # Add Tiered sections 4-7
    compiled_text["4. CORE IT RULES"] = TIERED_POLICY["4. CORE IT RULES"][core_tier].format(company_name=company_name)
    compiled_text["5. GENERATIVE AI USAGE"] = TIERED_POLICY["5. GENERATIVE AI USAGE"][ai_tier].format(company_name=company_name)
    compiled_text["6. REMOTE WORK / VPN"] = TIERED_POLICY["6. REMOTE WORK / VPN"][remote_tier].format(company_name=company_name)
    compiled_text["7. PERSONAL DEVICE / BYOD"] = TIERED_POLICY["7. PERSONAL DEVICE / BYOD"][byod_tier].format(company_name=company_name)
    
    # Add Base sections 8-11
    compiled_text["8. MONITORING AND PRIVACY"] = BASE_POLICY["8. MONITORING AND PRIVACY"].format(company_name=company_name)
    compiled_text["9. ENFORCEMENT & DISCIPLINARY ACTION"] = BASE_POLICY["9. ENFORCEMENT & DISCIPLINARY ACTION"].format(company_name=company_name)
    compiled_text["10. INCIDENT REPORTING"] = BASE_POLICY["10. INCIDENT REPORTING"].format(company_name=company_name, security_contact=security_contact)
    compiled_text["11. ACKNOWLEDGMENT"] = BASE_POLICY["11. ACKNOWLEDGMENT"].format(company_name=company_name)
    
    return compiled_text

policy_content = compile_policy()

# Document Generation Functions
def generate_docx():
    doc = Document()
    
    # --- TITLE PAGE ---
    # Add some spacing before title
    for _ in range(5):
        doc.add_paragraph()
        
    title = doc.add_paragraph("ACCEPTABLE USE POLICY")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.runs[0].font.size = Pt(24)
    title.runs[0].font.bold = True
    
    subtitle = doc.add_paragraph(f"{company_name.upper()}")
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.runs[0].font.size = Pt(16)
    
    date_p = doc.add_paragraph(f"Effective Date: {effective_date.strftime('%B %d, %Y')}")
    date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_p.runs[0].font.size = Pt(12)
    
    doc.add_page_break()
    
    # --- FOOTER ---
    section = doc.sections[0]
    footer = section.footer
    footer_para = footer.paragraphs[0]
    footer_para.text = f"Proprietary & Confidential | Prepared for {company_name} by SOP Mojo's AUP Engine."
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_para.runs[0].font.italic = True
    footer_para.runs[0].font.size = Pt(9)
    
    # --- CONTENT ---
    for heading, text in policy_content.items():
        h = doc.add_heading(heading, level=1)
        h.runs[0].font.size = Pt(14)
        p = doc.add_paragraph(text)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        
    # --- DOCUMENT CONTROL BLOCK ---
    doc.add_heading("12. DOCUMENT CONTROL", level=1).runs[0].font.size = Pt(14)
    control_text = f"Policy Owner: {policy_owner}\nIndustry: {industry}\nVersion: 1.0\nNext Review Date: {datetime.today().replace(year=datetime.today().year + 1).strftime('%B %d, %Y')}"
    doc.add_paragraph(control_text)
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

def generate_pdf():
    pdf = LegalPDF(company_name=company_name)
    pdf.add_page()
    
    # --- TITLE PAGE ---
    pdf.ln(60)
    pdf.set_font("Times", "B", 24)
    pdf.cell(0, 15, sanitize_text("ACCEPTABLE USE POLICY"), align="C", ln=True)
    pdf.set_font("Times", "B", 16)
    pdf.cell(0, 10, sanitize_text(company_name.upper()), align="C", ln=True)
    pdf.ln(10)
    pdf.set_font("Times", "", 12)
    pdf.cell(
        0,
        10,
        sanitize_text(f"Effective Date: {effective_date.strftime('%B %d, %Y')}"),
        align="C",
        ln=True,
    )
    
    pdf.add_page()
    
    # --- CONTENT ---
    for heading, text in policy_content.items():
        pdf.set_font("Times", "B", 14)
        pdf.cell(0, 10, sanitize_text(heading), ln=True)
        pdf.set_font("Times", "", 11)
        pdf.multi_cell(0, 7, sanitize_text(text))
        pdf.ln(5)
        
    # --- DOCUMENT CONTROL BLOCK ---
    pdf.set_font("Times", "B", 14)
    pdf.cell(0, 10, sanitize_text("12. DOCUMENT CONTROL"), ln=True)
    pdf.set_font("Times", "", 11)
    control_text = f"Policy Owner: {policy_owner}\nIndustry: {industry}\nVersion: 1.0\nNext Review Date: {datetime.today().replace(year=datetime.today().year + 1).strftime('%B %d, %Y')}"
    pdf.multi_cell(0, 7, sanitize_text(control_text))
    
    # Output to byte array
    return bytes(pdf.output())

st.divider()

# Legal disclaimer (highly visible but unobtrusive)
st.caption(
    "Disclaimer: SOP Mojo is an operational frameworks provider, not a law firm. "
    "This tool generates a structural foundation for an Acceptable Use Policy based "
    "on standard industry practices. It does not constitute formal legal advice. We "
    "strongly recommend having your final document reviewed by qualified legal counsel "
    "prior to official company deployment."
)

if "documents_ready" not in st.session_state:
    st.session_state["documents_ready"] = False

if st.button("Generate Policy Documents", type="primary", use_container_width=True):
    required_business_details = [company_name, short_name, industry, policy_owner, security_contact]
    if any(not str(detail).strip() for detail in required_business_details):
        st.error("Action Required: Please fill out all business details before generating your policy.")
        st.session_state["documents_ready"] = False
        st.stop()
    st.session_state["documents_ready"] = True

if st.session_state["documents_ready"]:
    # Download Buttons
    col3, col4 = st.columns(2)

    with col3:
        docx_file = generate_docx()
        st.download_button(
            label="📝 Download Professional Word / Google Doc",
            data=docx_file,
            file_name=f"{company_name.replace(' ', '_')}_AUP.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            use_container_width=True,
            type="primary"
        )

    with col4:
        pdf_file = generate_pdf()
        st.download_button(
            label="📥 Download Legal-Grade PDF",
            data=pdf_file,
            file_name=f"{company_name.replace(' ', '_')}_AUP.pdf",
            mime="application/pdf",
            use_container_width=True,
            type="primary"
        )