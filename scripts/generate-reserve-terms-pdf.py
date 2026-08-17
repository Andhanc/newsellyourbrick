#!/usr/bin/env python3
"""Generate the customer-facing property reservation terms PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "documents" / "reserve-terms.pdf"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

TIFFANY = colors.HexColor("#4ECDD6")
TIFFANY_DARK = colors.HexColor("#087F8C")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#DCE7E9")
WASH = colors.HexColor("#F2FAFA")


pdfmetrics.registerFont(TTFont("SYBArial", FONT_REGULAR))
pdfmetrics.registerFont(TTFont("SYBArialBold", FONT_BOLD))


def page_chrome(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    canvas.setFont("SYBArialBold", 15)
    canvas.setFillColor(INK)
    canvas.drawString(22 * mm, height - 20 * mm, "Sell")
    sell_width = pdfmetrics.stringWidth("Sell", "SYBArialBold", 15)
    canvas.setFillColor(TIFFANY_DARK)
    canvas.drawString(22 * mm + sell_width, height - 20 * mm, "Your")
    your_width = pdfmetrics.stringWidth("Your", "SYBArialBold", 15)
    canvas.setFillColor(INK)
    canvas.drawString(22 * mm + sell_width + your_width, height - 20 * mm, "Brick")

    canvas.setStrokeColor(TIFFANY)
    canvas.setLineWidth(1.6)
    canvas.line(22 * mm, height - 24 * mm, width - 22 * mm, height - 24 * mm)

    canvas.setFont("SYBArial", 8.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(22 * mm, 13 * mm, "Условия резервирования объекта недвижимости")
    canvas.drawRightString(width - 22 * mm, 13 * mm, f"Страница {doc.page}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="DocTitle",
        fontName="SYBArialBold",
        fontSize=24,
        leading=29,
        textColor=INK,
        spaceAfter=5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Lead",
        fontName="SYBArial",
        fontSize=11,
        leading=17,
        textColor=MUTED,
        spaceAfter=5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Section",
        fontName="SYBArialBold",
        fontSize=14,
        leading=18,
        textColor=INK,
        spaceBefore=4 * mm,
        spaceAfter=2.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyRu",
        fontName="SYBArial",
        fontSize=10.2,
        leading=15.5,
        textColor=colors.HexColor("#344054"),
        spaceAfter=2.4 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyBoldRu",
        parent=styles["BodyRu"],
        fontName="SYBArialBold",
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="CardTitle",
        fontName="SYBArialBold",
        fontSize=10.5,
        leading=14,
        textColor=TIFFANY_DARK,
        spaceAfter=1 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CardText",
        fontName="SYBArial",
        fontSize=9.2,
        leading=13.2,
        textColor=colors.HexColor("#475467"),
    )
)
styles.add(
    ParagraphStyle(
        name="Fine",
        fontName="SYBArial",
        fontSize=8.3,
        leading=12,
        textColor=MUTED,
        alignment=TA_LEFT,
    )
)


def section(number, title, paragraphs):
    items = [Paragraph(f"{number}. {title}", styles["Section"])]
    items.extend(Paragraph(text, styles["BodyRu"]) for text in paragraphs)
    return items


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=31 * mm,
        bottomMargin=21 * mm,
        title="Условия резервирования объекта недвижимости - SellYourBrick",
        author="SellYourBrick",
        subject="Условия оплаты резерва и дальнейшего оформления сделки",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="terms", frames=[frame], onPage=page_chrome)])

    story = [
        Paragraph("Условия резервирования", styles["DocTitle"]),
        Paragraph(
            "Коротко и прозрачно о том, что именно оплачивается сейчас, как объект закрепляется за покупателем и что происходит дальше.",
            styles["Lead"],
        ),
    ]

    cards = [
        [
            Paragraph("Резерв", styles["CardTitle"]),
            Paragraph("10% от цены объекта или финальной победной ставки.", styles["CardText"]),
        ],
        [
            Paragraph("Статус", styles["CardTitle"]),
            Paragraph("Оплачен только резерв. Полная продажа еще оформляется.", styles["CardText"]),
        ],
        [
            Paragraph("Подтверждение", styles["CardTitle"]),
            Paragraph("Платеж считается успешным после подтверждения Stripe.", styles["CardText"]),
        ],
    ]
    card_table = Table([cards], colWidths=[doc.width / 3] * 3, hAlign="LEFT")
    card_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WASH),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.7, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    notice = Table(
        [[Paragraph("Важно", styles["BodyBoldRu"]), Paragraph("Документ описывает стандартный пользовательский сценарий. Для рабочей юридической среды текст должен быть проверен консультантом с учетом страны объекта и модели сделки.", styles["Fine"])]],
        colWidths=[24 * mm, doc.width - 24 * mm],
    )
    notice.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF8E8")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#F4D79B")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.extend([card_table, Spacer(1, 3 * mm), notice, Spacer(1, 2 * mm)])

    story.extend(
        section(
            1,
            "Что означает резерв",
            [
                "Резерв фиксирует намерение покупателя приобрести выбранный объект и временно закрепляет объект за ним на период оформления. Резерв не является полной оплатой недвижимости и сам по себе не означает переход права собственности.",
                "После успешной оплаты в кабинете отображается статус «Резерв оплачен». Далее менеджер связывается с покупателем и продавцом, проверяет документы и согласует порядок окончательного расчета.",
            ],
        )
    )
    story.extend(
        section(
            2,
            "Сумма и способ оплаты",
            [
                "Стандартная сумма резерва составляет 10% от фиксированной цены объекта. Для победителя аукциона расчет выполняется от финальной победной ставки. Точная сумма всегда показывается в интерфейсе до перехода к оплате.",
                "Оплата проходит на защищенной странице Stripe. Заявка на покупку создается со статусом «В обработке» только после того, как Stripe подтвердит успешный платеж.",
                "Если интерфейс предлагает зачесть часть средств с внутреннего депозита, итоговая сумма к оплате показывается до подтверждения. Остаток депозита продолжает храниться на балансе пользователя.",
            ],
        )
    )
    story.extend(
        section(
            3,
            "Срок резервирования",
            [
                "Базовый срок резервирования составляет 7 календарных дней с момента подтверждения платежа, если для конкретного объекта в карточке или индивидуальных условиях не указан другой срок.",
                "До окончания этого срока стороны должны согласовать документы, способ окончательного расчета и предполагаемую дату завершения сделки. При объективной задержке срок может быть изменен по согласованию сторон через менеджера платформы.",
            ],
        )
    )
    story.extend(
        section(
            4,
            "Отмена и возврат",
            [
                "Если продавец не может завершить продажу либо платформа обнаруживает существенную проблему с объектом или документами, резерв подлежит возврату покупателю тем же способом, которым была выполнена оплата, если закон или правила платежной системы не требуют иного.",
                "Если покупатель самостоятельно отказывается от сделки, порядок возврата определяется индивидуальными условиями объекта, причиной отказа и применимым законодательством. До оплаты покупатель должен уточнить спорные условия у менеджера.",
                "Срок фактического зачисления возврата зависит от банка и Stripe. Платформа уведомляет пользователя после запуска возврата.",
            ],
        )
    )
    story.extend(
        section(
            5,
            "Завершение сделки",
            [
                "Статус «Сделка завершена» устанавливается только после подтверждения окончательного расчета и выполнения необходимых формальностей. До этого момента объект в кабинете покупателя остается в процессе оформления.",
                "После завершения сделки покупатель получает возможность подготовить объект к повторной продаже в кабинете продавца. Публикация новой карточки выполняется отдельно и проходит обычную проверку платформы.",
            ],
        )
    )
    story.extend(
        section(
            6,
            "Уведомления и связь",
            [
                "Ключевые изменения статуса отображаются в кабинете и уведомлениях: подтверждение резерва, обработка заявки, отмена либо завершение сделки.",
                "Для уточнения документов, сроков или возврата используйте чат с менеджером внутри платформы. Не передавайте платежные данные, коды подтверждения или пароли третьим лицам.",
            ],
        )
    )
    story.extend(
        section(
            7,
            "Согласие",
            [
                "Отмечая согласие в интерфейсе, покупатель подтверждает, что открыл этот документ, увидел точную сумму резерва и понимает, что оплачивает резерв, а не полную стоимость объекта.",
                "Условия применяются вместе с информацией в карточке объекта и индивидуальными документами сделки. При расхождении приоритет имеют подписанные сторонами документы и обязательные нормы применимого законодательства.",
            ],
        )
    )

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
