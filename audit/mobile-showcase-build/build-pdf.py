from pathlib import Path

from reportlab.pdfgen import canvas


ROOT = Path('/Users/vtichonenko/newsellyourbrick')
SLIDES = ROOT / 'audit/mobile-showcase/SellYourBrick-Mobile-Product-Showcase'
OUTPUT = ROOT / 'output/pdf/SellYourBrick-Mobile-Product-Showcase.pdf'


def main() -> None:
    pages = sorted(SLIDES.glob('slide-*.png'))
    if len(pages) != 20:
        raise RuntimeError(f'Expected 20 rendered slides, found {len(pages)}')

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(1280, 720), pageCompression=1)
    pdf.setTitle('SellYourBrick — Mobile Product Showcase')
    pdf.setAuthor('SellYourBrick')
    pdf.setSubject('Mobile-only visual showcase and design consistency review')

    for page in pages:
        pdf.drawImage(str(page), 0, 0, width=1280, height=720, preserveAspectRatio=False)
        pdf.showPage()

    pdf.save()
    print(OUTPUT)


if __name__ == '__main__':
    main()
