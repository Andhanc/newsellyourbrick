from pathlib import Path

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas


ROOT = Path("/Users/vtichonenko/newsellyourbrick")
SLIDES = ROOT / "audit/visual-brandbook/SellYourBrick-Visual-Brandbook"
OUTPUT = ROOT / "output/pdf/SellYourBrick-Visual-Brandbook.pdf"
PAGE_WIDTH = 1280
PAGE_HEIGHT = 720


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(OUTPUT), pagesize=(PAGE_WIDTH, PAGE_HEIGHT), pageCompression=1)

    for number in range(1, 14):
        slide_path = SLIDES / f"slide-{number}.png"
        if not slide_path.exists():
            raise FileNotFoundError(slide_path)
        canvas.drawImage(
            ImageReader(str(slide_path)),
            0,
            0,
            width=PAGE_WIDTH,
            height=PAGE_HEIGHT,
            preserveAspectRatio=True,
            anchor="c",
            mask="auto",
        )
        canvas.showPage()

    canvas.setTitle("SellYourBrick Visual Brandbook")
    canvas.setAuthor("SellYourBrick")
    canvas.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
