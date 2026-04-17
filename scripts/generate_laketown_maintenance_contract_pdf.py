#!/usr/bin/env python3
"""One-off generator for LakeTown / Mango Season Labs Ltd maintenance agreement PDF."""

from pathlib import Path

from fpdf import FPDF

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OUT = Path(__file__).resolve().parent.parent / "LakeTown-Software-Service-Maintenance-Agreement.pdf"


class ContractPDF(FPDF):
    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(80, 80, 80)
        self.set_x(self.l_margin)
        self.cell(self.epw, 8, f"Page {self.page_no()}", align="C")
        self.set_text_color(0, 0, 0)


def mc(pdf: ContractPDF, h: float, text: str, **kwargs: object) -> None:
    """multi_cell at left margin; required after centered blocks (fpdf uses x for width)."""
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, h, text, **kwargs)


def add_heading(pdf: ContractPDF, text: str) -> None:
    pdf.ln(4)
    pdf.set_font("DejaVu", "B", 12)
    mc(pdf, 7, text)
    pdf.set_font("DejaVu", "", 11)


def add_para(pdf: ContractPDF, text: str) -> None:
    pdf.set_font("DejaVu", "", 11)
    mc(pdf, 6, text)
    pdf.ln(2)


def add_bullets(pdf: ContractPDF, lines: list[str]) -> None:
    pdf.set_font("DejaVu", "", 11)
    for line in lines:
        mc(pdf, 6, f"    \u2022  {line}")
    pdf.ln(2)


def main() -> None:
    pdf = ContractPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)
    pdf.add_page()

    pdf.add_font("DejaVu", "", FONT_REG)
    pdf.add_font("DejaVu", "B", FONT_BOLD)

    # Title
    pdf.set_font("DejaVu", "B", 14)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 8, "SOFTWARE SERVICE & MAINTENANCE AGREEMENT", align="C")
    pdf.ln(6)

    pdf.set_font("DejaVu", "", 11)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        pdf.epw,
        6,
        "BETWEEN: Mango Season Labs Ltd (the \"Provider\")\n"
        "AND: LakeTown (the \"Client\")",
        align="C",
    )
    pdf.ln(8)

    # Section 1
    add_heading(pdf, "1. THE SCOPE OF DELIVERY")
    add_para(
        pdf,
        "The Provider has delivered and deployed a full-stack software system for "
        "LakeTown. The system is comprised of 18 functional modules integrated into "
        "a NestJS API and Next.js frontend:",
    )
    add_bullets(
        pdf,
        [
            "Identity & Access: Auth, Users, Roles, ActivityLog.",
            "Inventory Pipeline: Branches, Products, Recipes, StockSessions, "
            "StockEntries, Suppliers, StockShare.",
            "Commercial Operations: Production (Recipe-based), Sales (Payments/Items), "
            "RestaurantOrders, Customers, Partners.",
            "Intelligence & Assets: Reports (Aggregated Data), Uploads.",
        ]
    )

    # Section 2
    add_heading(pdf, '2. INITIAL POST-DEPLOYMENT PHASE (THE "GRACE PERIOD")')
    add_para(
        pdf,
        "The Provider shall provide an initial two (2) month period of service "
        "starting from the Effective Date of deployment.",
    )
    add_bullets(
        pdf,
        [
            "Complimentary Hosting: The Provider will cover all server and infrastructure "
            "costs for these 2 months.",
            'Complimentary Maintenance: The Provider will handle "Small Changes," defined as:',
        ]
    )
    pdf.set_font("DejaVu", "", 11)
    for line in [
        "Minor UI adjustments and text changes.",
        "Bug fixes for existing features within the 18 modules.",
        "Configuration tweaks for the production environment.",
    ]:
        mc(pdf, 6, f"        \u2013  {line}")
    pdf.ln(2)
    add_bullets(
        pdf,
        [
            'Exclusions: This phase does not include "Major Changes" (e.g., building a '
            "19th module, re-architecting the database schema, or adding new business "
            "logic flows).",
        ]
    )

    # Section 3
    add_heading(pdf, "3. LONG-TERM SERVICE LEVEL AGREEMENT (SLA)")
    add_para(
        pdf,
        "Upon completion of the 2-month Grace Period, the Client shall transition to "
        "a Monthly SLA Subscription. The following fees apply:",
    )
    add_bullets(
        pdf,
        [
            "Initial deployment fee: KSH 60,000 (one-time), for the delivered system.",
            "Monthly SLA fee: KSH 2,000 per month after the Grace Period.",
            "Included Services:",
        ]
    )
    for line in [
        "Server Costs: Continued provision and management of the production server environment.",
        "General Maintenance: Ongoing uptime monitoring, security patching, and bug fixes "
        "to ensure system stability.",
        "Technical Support: Direct assistance for system-related issues during standard "
        "business hours.",
    ]:
        pdf.set_font("DejaVu", "", 11)
        mc(pdf, 6, f"        \u2013  {line}")
    pdf.ln(2)
    add_bullets(
        pdf,
        [
            "Billing Cycle: The flat fee is due on the [1st/5th] of every month.",
        ]
    )

    # Section 4
    add_heading(pdf, "4. ADDITIONAL WORKS & CHANGE ORDERS")
    add_para(
        pdf,
        "Any work requested by LakeTown that falls outside General Maintenance will be "
        "billed separately. This includes:",
    )
    add_bullets(
        pdf,
        [
            "Development of entirely new modules or features.",
            "Integration with third-party APIs not included in the original 18 modules.",
            "On-site staff training or hardware procurement.",
            "Procedure: For any addition, Mango Season Labs Ltd will provide a quote; work "
            "begins only upon Client approval.",
        ]
    )

    # Section 5
    add_heading(pdf, "5. INTELLECTUAL PROPERTY & DATA")
    add_bullets(
        pdf,
        [
            "Code Ownership: Upon full payment of deployment fees, LakeTown owns the "
            "application logic and database schema.",
            "Data Sovereignty: All data entered into the system (Sales, Customer, Stock "
            "records) is the sole property of LakeTown.",
            "Confidentiality: Mango Season Labs Ltd agrees to maintain strict confidentiality "
            "regarding LakeTown's business operations and proprietary data accessed "
            "during maintenance.",
        ]
    )

    # Section 6
    add_heading(pdf, "6. TERMINATION")
    add_para(
        pdf,
        "Either party may terminate the Monthly SLA by providing 30 days' written notice.",
    )
    add_bullets(
        pdf,
        [
            "If LakeTown terminates, Mango Season Labs Ltd will facilitate the handover of the "
            "code and database to a server of LakeTown's choosing at a cost to be determined.",
            "Outstanding maintenance fees must be settled before the final handover.",
        ]
    )

    # Section 7
    add_heading(pdf, "7. SIGNATURES")
    pdf.ln(6)
    pdf.set_font("DejaVu", "", 11)
    pdf.set_x(pdf.l_margin)
    pdf.cell(pdf.epw, 8, "For Mango Season Labs Ltd: ___________________________")
    pdf.ln(6)
    pdf.set_x(pdf.l_margin)
    pdf.cell(pdf.epw, 6, "Authorized Signatory    Date: ____________________")
    pdf.ln(12)
    pdf.set_x(pdf.l_margin)
    pdf.cell(pdf.epw, 8, "For LakeTown: ___________________________")
    pdf.ln(6)
    pdf.set_x(pdf.l_margin)
    pdf.cell(pdf.epw, 6, "Authorized Signatory    Date: ____________________")

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
