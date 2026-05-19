from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

OUTPUT = r"C:\Users\kisma\chezmoici\.claude\worktrees\trusting-chatterjee-a916af\HaloBraids_Plan_Affaires.pdf"

GOLD       = colors.HexColor("#C9A96E")
GOLD_DARK  = colors.HexColor("#9C7A42")
GOLD_LT    = colors.HexColor("#E8D5B0")
BROWN      = colors.HexColor("#2A1A08")
BROWN_MID  = colors.HexColor("#5C3317")
CREAM      = colors.HexColor("#FAF5EE")
CREAM2     = colors.HexColor("#F2EBE0")
MUTED      = colors.HexColor("#7A6A55")
GREEN      = colors.HexColor("#2D6A4F")
GREEN_LT   = colors.HexColor("#D8F3DC")
RED_LT     = colors.HexColor("#FFE8E8")
RED        = colors.HexColor("#9B2335")
BLUE_LT    = colors.HexColor("#EBF5FB")
BLUE       = colors.HexColor("#1A5276")
WHITE      = colors.white
BLACK      = colors.HexColor("#0C0806")

W, H = A4

def s(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=15,
                textColor=BROWN, spaceAfter=3)
    base.update(kw)
    return ParagraphStyle(name, **base)

ST = {
    "cover_title":  s("ct",  fontName="Helvetica-Bold", fontSize=40, leading=46,
                      textColor=WHITE, alignment=TA_CENTER, spaceAfter=4),
    "cover_sub":    s("cs",  fontName="Helvetica", fontSize=15, leading=20,
                      textColor=GOLD, alignment=TA_CENTER, spaceAfter=3),
    "cover_tag":    s("ctg", fontName="Helvetica", fontSize=8.5, leading=13,
                      textColor=colors.HexColor("#D4B898"), alignment=TA_CENTER),
    "section":      s("sec", fontName="Helvetica-Bold", fontSize=13, leading=18,
                      textColor=GOLD_DARK, spaceBefore=18, spaceAfter=5),
    "subsection":   s("sub", fontName="Helvetica-Bold", fontSize=10, leading=14,
                      textColor=BROWN_MID, spaceBefore=10, spaceAfter=4),
    "body":         s("bod", fontName="Helvetica", fontSize=9.5, leading=15,
                      textColor=BROWN, spaceAfter=4, alignment=TA_JUSTIFY),
    "bullet":       s("bul", fontName="Helvetica", fontSize=9.5, leading=14,
                      textColor=BROWN, leftIndent=14, spaceAfter=3, bulletIndent=4),
    "label":        s("lbl", fontName="Helvetica-Bold", fontSize=7.5, leading=12,
                      textColor=GOLD_DARK, spaceAfter=2, spaceBefore=6),
    "note":         s("nt",  fontName="Helvetica-Oblique", fontSize=8.5,
                      leading=13, textColor=MUTED, spaceAfter=6),
    "highlight_box":s("hb",  fontName="Helvetica-Bold", fontSize=10.5,
                      leading=15, textColor=BROWN_MID, spaceAfter=2),
    "kv_key":       s("kvk", fontName="Helvetica-Bold", fontSize=9.5,
                      textColor=BROWN_MID),
    "kv_val":       s("kvv", fontName="Helvetica", fontSize=9.5, textColor=BROWN),
    "stat_num":     s("stn", fontName="Helvetica-Bold", fontSize=22,
                      textColor=GOLD_DARK, alignment=TA_CENTER, spaceAfter=1),
    "stat_lbl":     s("stl", fontName="Helvetica", fontSize=7.5,
                      textColor=MUTED, alignment=TA_CENTER, leading=11),
    "toc_item":     s("toc", fontName="Helvetica", fontSize=9.5,
                      textColor=BROWN, leading=16, spaceAfter=2),
    "page_title":   s("pt",  fontName="Helvetica-Bold", fontSize=18, leading=22,
                      textColor=BROWN, spaceAfter=8),
}

def hr(color=GOLD, thick=0.6, sb=4, sa=8):
    return HRFlowable(width="100%", thickness=thick, color=color,
                      spaceBefore=sb, spaceAfter=sa)

def sec(num, title):
    return KeepTogether([
        Spacer(1, 4),
        hr(GOLD, 0.5, 2, 0),
        Paragraph(f"{num}. {title}", ST["section"]),
        hr(GOLD_DARK, 0.3, 0, 5),
    ])

def bl(txt):
    return Paragraph(f"<bullet>&bull;</bullet> {txt}", ST["bullet"])

def lbl(t):
    return Paragraph(t, ST["label"])

def body(t):
    return Paragraph(t, ST["body"])

def sp(h=4):
    return Spacer(1, h*mm)

def tbl(data, cw=None, hlt_last=False, hlt_first_col=False,
        row_colors=None, header_bg=None):
    n = len(data[0])
    if cw is None:
        cw = [156*mm / n] * n
    cs = ParagraphStyle("tc", fontName="Helvetica", fontSize=8.5,
                         leading=12, textColor=BROWN)
    hs = ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8.5,
                         leading=12, textColor=WHITE)
    rows = []
    for i, row in enumerate(data):
        st = hs if i == 0 else cs
        rows.append([Paragraph(str(c), st) for c in row])

    rh = 8.5*mm
    t = Table(rows, colWidths=cw, rowHeights=[rh]*len(rows))
    hbg = header_bg or BROWN
    rc  = row_colors or [CREAM, CREAM2]
    ts = [
        ("BACKGROUND",    (0,0), (-1,0), hbg),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), rc),
        ("BOX",           (0,0),(-1,-1), 0.5, colors.HexColor("#C8B898")),
        ("LINEBELOW",     (0,0),(-1,-2), 0.3, colors.HexColor("#D8CAB8")),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 7),
        ("RIGHTPADDING",  (0,0),(-1,-1), 7),
    ]
    if hlt_last:
        ws = ParagraphStyle("tw", fontName="Helvetica-Bold",
                             fontSize=8.5, leading=12, textColor=WHITE)
        rows[-1] = [Paragraph(str(data[-1][j]), ws) for j in range(n)]
        t = Table(rows, colWidths=cw, rowHeights=[rh]*len(rows))
        ts += [("BACKGROUND",(0,-1),(-1,-1), BROWN_MID),
               ("FONTNAME",  (0,-1),(-1,-1), "Helvetica-Bold")]
    if hlt_first_col:
        ts += [("BACKGROUND",(0,1),(0,-1), CREAM2),
               ("FONTNAME",  (0,1),(0,-1), "Helvetica-Bold"),
               ("TEXTCOLOR", (0,1),(0,-1), BROWN_MID)]
    t.setStyle(TableStyle(ts))
    return [t, sp(2)]

def stat_box(items):
    """items = [(number, label), ...]"""
    cells = [[Paragraph(n, ST["stat_num"]),
              Paragraph(l, ST["stat_lbl"])] for n, l in items]
    col_data = [cells[i] for i in range(len(cells))]
    t = Table([col_data], colWidths=[156*mm / len(items)]*len(items))
    t.setStyle(TableStyle([
        ("BOX",        (0,0),(-1,-1), 0.5, GOLD_LT),
        ("LINEAFTER",  (0,0),(-2,-1), 0.3, GOLD_LT),
        ("BACKGROUND", (0,0),(-1,-1), CREAM2),
        ("VALIGN",     (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ]))
    return [t, sp(3)]

def info_box(text, bg=BLUE_LT, border=BLUE):
    t = Table([[Paragraph(text, ParagraphStyle("ib", fontName="Helvetica",
                fontSize=9, leading=14, textColor=BROWN, leftIndent=4))]],
              colWidths=[156*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), bg),
        ("BOX",           (0,0),(-1,-1), 0.8, border),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("TOPPADDING",    (0,0),(-1,-1), 7),
        ("BOTTOMPADDING", (0,0),(-1,-1), 7),
    ]))
    return [t, sp(3)]

# ──────────────────────────────────────────────────────────────────────────────
# PAGE BACKGROUNDS
# ──────────────────────────────────────────────────────────────────────────────
def bg_cover(c, doc):
    c.saveState()
    c.setFillColor(BLACK); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GOLD);  c.rect(0,H-5*mm,W,4*mm,fill=1,stroke=0)
    c.setFillColor(GOLD);  c.rect(0,9*mm,W,3*mm,fill=1,stroke=0)
    c.setFillColorRGB(0.55,0.35,0.1,alpha=0.06)
    c.circle(W/2, H/2+20*mm, 140*mm, fill=1, stroke=0)
    c.setStrokeColor(GOLD); c.setLineWidth(0.25)
    for o in [-12*mm,12*mm]:
        c.line(22*mm,H/2+o+55*mm, W-22*mm,H/2+o+55*mm)
    c.restoreState()

def bg_inner(c, doc):
    c.saveState()
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GOLD);  c.rect(0,H-3*mm,W,3*mm,fill=1,stroke=0)
    c.setFillColor(CREAM2);c.rect(0,0,W,14*mm,fill=1,stroke=0)
    c.setFont("Helvetica",7); c.setFillColor(MUTED)
    c.drawCentredString(W/2, 5*mm,
        f"HALO BRAIDS  ·  Plan d'affaires  ·  Ottawa-Gatineau  ·  2026   |   Page {doc.page}")
    c.setFillColor(GOLD);  c.rect(0,14*mm,2.5*mm,H-17*mm,fill=1,stroke=0)
    c.restoreState()

# ──────────────────────────────────────────────────────────────────────────────
# BUILD
# ──────────────────────────────────────────────────────────────────────────────
def build():
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
        leftMargin=22*mm, rightMargin=22*mm,
        topMargin=18*mm, bottomMargin=22*mm,
        title="Plan d'affaires — Halo Braids 2026",
        author="Halo Braids")
    S = []

    # ── COVER ──────────────────────────────────────────────────────────────────
    S.append(sp(42))
    S.append(Paragraph("HALO BRAIDS", ST["cover_title"]))
    gold_line = Table([[""]], colWidths=[70*mm], rowHeights=[1*mm])
    gold_line.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),GOLD)]))
    outer = Table([[gold_line]], colWidths=[156*mm])
    outer.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER")]))
    S += [sp(2), outer, sp(3)]
    S.append(Paragraph("PLAN D'AFFAIRES 2026", ST["cover_sub"]))
    S.append(Paragraph("Studio de Tressage de Luxe  ·  Ottawa-Gatineau", ST["cover_tag"]))
    S.append(sp(18))

    cover_kv = [
        ["Secteur",       "Soins capillaires / Beauté de luxe"],
        ["Marché",        "Ottawa (ON)  +  Gatineau (QC)"],
        ["Modèle",        "Studio sur rendez-vous — haut de gamme"],
        ["Objectif An 1", "80 000 – 110 000 $ CA (revenus bruts)"],
        ["Investissement","8 000 – 13 000 $ (démarrage)"],
        ["Année",         "2026"],
    ]
    ck = ParagraphStyle("ck", fontName="Helvetica-Bold", fontSize=8,
                         textColor=GOLD_DARK)
    cv = ParagraphStyle("cv", fontName="Helvetica",      fontSize=9,
                         textColor=WHITE)
    ct = Table([[Paragraph(k,ck), Paragraph(v,cv)] for k,v in cover_kv],
               colWidths=[52*mm, 104*mm], rowHeights=9*mm)
    ct.setStyle(TableStyle([
        ("ROWBACKGROUNDS",(0,0),(-1,-1),
         [colors.HexColor("#1A1108"),colors.HexColor("#150F06")]),
        ("LINEBELOW",(0,0),(-1,-2),0.3,colors.HexColor("#3A2810")),
        ("BOX",(0,0),(-1,-1),0.5,GOLD),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),10),
    ]))
    S += [ct, sp(16)]
    S.append(Paragraph("CONFIDENTIEL  ·  USAGE INTERNE  ·  2026", ST["cover_tag"]))
    S.append(PageBreak())

    # ── TABLE DES MATIÈRES ─────────────────────────────────────────────────────
    S.append(Paragraph("TABLE DES MATIÈRES", ST["page_title"]))
    S += hr(GOLD,0.8,0,8),
    toc = [
        ("1.", "Résumé Exécutif"),
        ("2.", "Analyse du Marché — Ottawa-Gatineau"),
        ("3.", "Analyse SWOT"),
        ("4.", "Profils Clients (Personas)"),
        ("5.", "Services & Tarification"),
        ("6.", "Analyse Concurrentielle"),
        ("7.", "Stratégie Marketing & Acquisition"),
        ("8.", "Plan Opérationnel"),
        ("9.", "Ressources Humaines"),
        ("10.","Projections Financières Détaillées"),
        ("11.","Point Mort & Seuil de Rentabilité"),
        ("12.","Structure Légale & Démarches"),
        ("13.","Investissement de Départ"),
        ("14.","Indicateurs de Performance (KPIs)"),
        ("15.","Analyse des Risques"),
        ("16.","Feuille de Route 18 Mois"),
    ]
    for num, title in toc:
        row = Table([[Paragraph(num, ParagraphStyle("tn",fontName="Helvetica-Bold",
                      fontSize=9.5,textColor=GOLD_DARK)),
                      Paragraph(title, ST["toc_item"]),
                      Paragraph("· · · · · · · · · ·",
                      ParagraphStyle("dots",fontName="Helvetica",fontSize=8,
                      textColor=GOLD_LT,alignment=TA_RIGHT))]],
                    colWidths=[12*mm,110*mm,34*mm])
        row.setStyle(TableStyle([
            ("LINEBELOW",(0,0),(-1,-1),0.3,GOLD_LT),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("LEFTPADDING",(0,0),(0,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),3),
            ("BOTTOMPADDING",(0,0),(-1,-1),3),
        ]))
        S.append(row)
    S.append(PageBreak())

    # ── 1. RÉSUMÉ EXÉCUTIF ─────────────────────────────────────────────────────
    S.append(sec("1","RÉSUMÉ EXÉCUTIF"))
    S.append(body(
        "Halo Braids est un studio de tressage de luxe ciblant le segment haut de gamme "
        "du marché de la coiffure protectrice à Ottawa-Gatineau. L'entreprise propose des "
        "services personnalisés sur rendez-vous dans un environnement moderne et élégant, "
        "s'adressant aux femmes souhaitant des coiffures protectrices de qualité supérieure. "
        "Le positionnement luxury, combiné à une stratégie digitale forte (Instagram, TikTok, "
        "Google), permet de capter une clientèle prête à investir entre 150 $ et 600 $ par visite."))
    S.append(sp(3))
    S += stat_box([
        ("$260", "Panier moyen / cliente"),
        ("500+", "Clientes an 1 (cible)"),
        ("~65 %","Marge brute moyenne"),
        ("$52K+","Bénéfice net an 1"),
    ])
    S += info_box(
        "<b>Proposition de valeur :</b> Halo Braids est la seule option de tressage "
        "vraiment haut de gamme à Ottawa-Gatineau — expérience premium de bout en bout, "
        "réservation en ligne, extensions incluses, et suivi post-service.",
        bg=colors.HexColor("#FEF9F0"), border=GOLD)

    # ── 2. ANALYSE DU MARCHÉ ───────────────────────────────────────────────────
    S.append(sec("2","ANALYSE DU MARCHÉ — OTTAWA-GATINEAU"))
    S.append(lbl("DONNÉES DÉMOGRAPHIQUES CLÉS"))
    S += tbl([
        ["Indicateur","Données","Source / Note"],
        ["Population RCN (Ottawa-Gatineau)","~1,5 million","Statistique Canada 2021"],
        ["Croissance pop. annuelle","~3,2 %","Immigration + naissances"],
        ["Communauté afro-descendante (Ottawa)","~65 000 personnes","Recensement 2021"],
        ["Femmes afro-descendantes 18-55 ans","~28 000","Estimation marché cible direct"],
        ["Revenu médian des ménages","~95 000 $ / an","StatCan, Ottawa CMA"],
        ["Dépenses moyennes coiffure / femme / an","800 – 2 000 $","IBIS World Canada 2024"],
        ["Part consacrée aux styles protecteurs","30 – 45 %","Enquête Mintel Beauty 2024"],
    ], cw=[72*mm,48*mm,36*mm])

    S.append(sp(3))
    S.append(lbl("TAILLE DU MARCHÉ ADRESSABLE"))
    S += tbl([
        ["Segment","Taille","Valeur estimée"],
        ["Marché total coiffure Ottawa-Gatineau","~$85M / an","IBIS World 2024"],
        ["Marché coiffure afro / protectrice","~$12M / an","~14 % du total"],
        ["Segment haut de gamme (>$150/visite)","~$3,5M / an","~29 % du segment"],
        ["Part de marché cible Halo Braids (an 3)","~2,5 %","~$87 000 / an"],
    ], cw=[80*mm,38*mm,38*mm])

    S.append(sp(3))
    S.append(lbl("TENDANCES DE L'INDUSTRIE 2024-2026"))
    for b in [
        "<b>+18 % / an</b> — Croissance des recherches Google «braids Ottawa» (2022-2024)",
        "<b>TikTok Hair</b> — Les vidéos de tressage génèrent en moyenne 2–8M de vues",
        "<b>Premiumisation</b> — La cliente accepte de payer davantage pour la qualité et l'expérience",
        "<b>Réservation en ligne</b> — 73 % des millennials préfèrent réserver via app ou site web",
        "<b>Naturalité</b> — Mouvement «Natural Hair» en croissance constante au Canada",
        "<b>Immigration</b> — Ottawa accueille ~12 000 immigrants afro-caribéens / an",
    ]:
        S.append(bl(b))

    # ── 3. ANALYSE SWOT ───────────────────────────────────────────────────────
    S.append(sec("3","ANALYSE SWOT"))
    swot_data = [
        [Paragraph("<b>FORCES</b>", ParagraphStyle("sw1",fontName="Helvetica-Bold",
          fontSize=9,textColor=WHITE)),
         Paragraph("<b>FAIBLESSES</b>", ParagraphStyle("sw2",fontName="Helvetica-Bold",
          fontSize=9,textColor=WHITE))],
        [Paragraph(
            "• Positionnement luxury unique à Ottawa\n"
            "• Expertise technique spécialisée\n"
            "• Site web professionnel & image de marque forte\n"
            "• Réservation en ligne = expérience fluide\n"
            "• Extensions premium incluses dans le prix\n"
            "• Réseau communautaire afro-canadien",
            ParagraphStyle("swc",fontName="Helvetica",fontSize=8.5,leading=14,
                           textColor=BROWN)),
         Paragraph(
            "• Capacité limitée (1 styliste au départ)\n"
            "• Pas encore de notoriété établie\n"
            "• Dépendance aux réseaux sociaux\n"
            "• Temps de service long (4-10 h)\n"
            "• Marché sensible à la récession\n"
            "• Faible barrière à l'entrée",
            ParagraphStyle("swc",fontName="Helvetica",fontSize=8.5,leading=14,
                           textColor=BROWN))],
        [Paragraph("<b>OPPORTUNITÉS</b>", ParagraphStyle("sw3",fontName="Helvetica-Bold",
          fontSize=9,textColor=WHITE)),
         Paragraph("<b>MENACES</b>", ParagraphStyle("sw4",fontName="Helvetica-Bold",
          fontSize=9,textColor=WHITE))],
        [Paragraph(
            "• Immigration africaine croissante à Ottawa\n"
            "• Peu de concurrents haut de gamme\n"
            "• Marché Gatineau sous-desservi\n"
            "• Tendance naturalité en forte hausse\n"
            "• Collaborations avec influenceuses locales\n"
            "• Revenus passifs : produits capillaires",
            ParagraphStyle("swc",fontName="Helvetica",fontSize=8.5,leading=14,
                           textColor=BROWN)),
         Paragraph(
            "• Nouvelles stylistes qui s'installent\n"
            "• Fluctuation des prix des extensions\n"
            "• Saisonnalité (été = pic, hiver = creux)\n"
            "• Copie du concept par la concurrence\n"
            "• Hausse des loyers commerciaux Ottawa\n"
            "• Burnout / limite physique de la styliste",
            ParagraphStyle("swc",fontName="Helvetica",fontSize=8.5,leading=14,
                           textColor=BROWN))],
    ]
    swot_table = Table(swot_data, colWidths=[78*mm,78*mm],
                       rowHeights=[8*mm, 42*mm, 8*mm, 42*mm])
    swot_table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0), GREEN),
        ("BACKGROUND",(1,0),(1,0), RED),
        ("BACKGROUND",(0,2),(0,2), BLUE),
        ("BACKGROUND",(1,2),(1,2), GOLD_DARK),
        ("BACKGROUND",(0,1),(0,1), GREEN_LT),
        ("BACKGROUND",(1,1),(1,1), RED_LT),
        ("BACKGROUND",(0,3),(0,3), BLUE_LT),
        ("BACKGROUND",(1,3),(1,3), CREAM2),
        ("BOX",(0,0),(-1,-1),1,colors.HexColor("#C8B898")),
        ("GRID",(0,0),(-1,-1),0.5,WHITE),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),6),
    ]))
    S += [swot_table, sp(3)]

    # ── 4. PERSONAS ───────────────────────────────────────────────────────────
    S.append(sec("4","PROFILS CLIENTS — PERSONAS"))
    personas = [
        ("LA PROFESSIONNELLE", "28-42 ans · Ottawa Centre / Westboro",
         "Travaille en entreprise ou dans la fonction publique fédérale. Revenu >$80K. "
         "Cherche un style élégant et soigné qui tient 6-8 semaines. Réserve en ligne, "
         "paie par carte. Budget: $250-$400 / visite. Fréquence: 5-7 fois/an.",
         "Instagram, LinkedIn, Google"),
        ("L'ÉTUDIANTE TENDANCE", "20-27 ans · Université d'Ottawa / Carleton",
         "Suit les tendances TikTok et Instagram. Sensible au prix mais prête à économiser "
         "pour un beau style. Cherche knotless ou boho braids. Budget: $180-$260 / visite. "
         "Fréquence: 4-6 fois/an. Forte influence sur son réseau.",
         "TikTok, Instagram, bouche-à-oreille"),
        ("LA MÈRE DE FAMILLE", "32-50 ans · Barrhaven / Nepean / Gatineau",
         "Cherche praticité et durabilité. Réserve pour elle et parfois sa fille. "
         "Apprécie le service de qualité et l'ambiance professionnelle. "
         "Budget: $160-$300 / visite. Fréquence: 4-5 fois/an.",
         "Facebook, Google, recommandations"),
    ]
    for name, demo, desc, channels in personas:
        row = Table([
            [Paragraph(f"<b>{name}</b>", ParagraphStyle("pn",fontName="Helvetica-Bold",
              fontSize=9,textColor=BROWN_MID)),
             Paragraph(demo, ParagraphStyle("pd",fontName="Helvetica-Oblique",
              fontSize=8.5,textColor=MUTED))],
            [Paragraph(desc, ParagraphStyle("pb",fontName="Helvetica",fontSize=8.5,
              leading=13,textColor=BROWN)),
             Paragraph(f"<b>Canaux :</b> {channels}",
              ParagraphStyle("pc",fontName="Helvetica",fontSize=8.5,leading=13,
              textColor=BROWN))],
        ], colWidths=[88*mm,68*mm], rowHeights=[8*mm,None])
        row.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0), CREAM2),
            ("BACKGROUND",(0,1),(-1,1), CREAM),
            ("BOX",(0,0),(-1,-1),0.5,GOLD_LT),
            ("LINEAFTER",(0,0),(0,-1),0.3,GOLD_LT),
            ("LEFTPADDING",(0,0),(-1,-1),8),
            ("TOPPADDING",(0,0),(-1,-1),5),
            ("BOTTOMPADDING",(0,0),(-1,-1),5),
            ("VALIGN",(0,0),(-1,-1),"TOP"),
        ]))
        S += [row, sp(2)]

    # ── 5. SERVICES & TARIFICATION ────────────────────────────────────────────
    S.append(sec("5","SERVICES & TARIFICATION"))
    S += tbl([
        ["Service","Prix min.","Prix max.","Durée moy.","Marge nette","Popularité"],
        ["Knotless Braids","200 $","350 $","6 h","~65 %","★★★★★"],
        ["Boho Braids",    "230 $","400 $","8 h","~62 %","★★★★★"],
        ["Fulani Braids",  "180 $","280 $","5 h","~68 %","★★★★"],
        ["Passion Twists", "170 $","260 $","5 h","~65 %","★★★★"],
        ["Goddess Locs",   "200 $","320 $","7 h","~63 %","★★★"],
        ["Cornrows",       "90 $", "150 $","3 h","~72 %","★★★"],
        ["Style Custom",   "300 $","600 $","Var.","~60 %","★★"],
    ], cw=[48*mm,20*mm,22*mm,22*mm,24*mm,20*mm])
    S.append(lbl("POLITIQUE TARIFAIRE"))
    for b in [
        "Acompte non remboursable : <b>50 $</b> à la réservation (déduit du total)",
        "Majoration <b>+15 %</b> pour longueur XL (mi-dos et plus)",
        "Majoration <b>+10 %</b> pour cheveux très épais ou non préparés",
        "Forfait fidélité : <b>10e visite offerte</b> (valeur moyenne : 260 $)",
        "Carte cadeau disponible : 100 $, 200 $, 300 $",
    ]:
        S.append(bl(b))

    # ── 6. ANALYSE CONCURRENTIELLE ────────────────────────────────────────────
    S.append(sec("6","ANALYSE CONCURRENTIELLE"))
    S += tbl([
        ["Critère","Halo Braids","Concurrent A\n(salon général)","Concurrent B\n(domicile)","Concurrent C\n(budget)"],
        ["Positionnement","★★★★★ Luxury","★★★ Mid","★★ Basic","★ Budget"],
        ["Réservation en ligne","✓ Oui","✗ Non","Partiel","✗ Non"],
        ["Extensions incluses","✓ Premium","Partiel","✗ Non","✗ Non"],
        ["Expérience client","★★★★★","★★★","★★","★"],
        ["Prix moyen","250-350 $","130-200 $","100-160 $","80-120 $"],
        ["Présence Instagram","Fort","Moyen","Faible","Très faible"],
        ["Site web pro","✓","Partiel","✗","✗"],
        ["Délai réservation","3-7 jours","1-2 jours","1 jour","Immédiat"],
    ], cw=[40*mm,34*mm,28*mm,28*mm,26*mm], hlt_first_col=True)
    S += info_box(
        "<b>Avantage concurrentiel durable :</b> Halo Braids est la seule option combinant "
        "expérience luxury, image de marque cohérente, réservation digitale et extensions "
        "premium incluses dans la région Ottawa-Gatineau.",
        bg=colors.HexColor("#FEF9F0"), border=GOLD)

    # ── 7. STRATÉGIE MARKETING ────────────────────────────────────────────────
    S.append(sec("7","STRATÉGIE MARKETING & ACQUISITION"))

    S.append(lbl("ENTONNOIR D'ACQUISITION"))
    S += tbl([
        ["Étape","Canal","Objectif","Coût estimé / mois"],
        ["Notoriété","TikTok / Instagram Reels","100K+ vues / mois","0 $ (organique)"],
        ["Considération","Google My Business + SEO","Top 3 recherche locale","50 $ / mois"],
        ["Conversion","Site web + Booking","RDV confirmés","0 $ (déjà fait)"],
        ["Fidélisation","Email / SMS / Carte fidélité","Taux retour > 65 %","20 $ / mois"],
        ["Ambassadeurs","Programme de référence","10 nouvelles / mois","100 $ en rabais"],
        ["Acquisition payante","Meta Ads (Instagram)","50 nouvelles / mois","200 $ / mois"],
    ], cw=[30*mm,40*mm,44*mm,32*mm])

    S.append(sp(3))
    S.append(lbl("STRATÉGIE DE CONTENU INSTAGRAM / TIKTOK"))
    S += tbl([
        ["Type de contenu","Fréquence","Objectif","Engagement attendu"],
        ["Avant / Après (Reel)","3× / semaine","Viralité + preuves sociales","8-15 % engagement"],
        ["Process de tressage (time-lapse)","2× / semaine","Fascination + partage","10-20 K vues"],
        ["Témoignages clientes","1× / semaine","Confiance + conversion","5-8 % engagement"],
        ["Conseils entretien tresses","2× / semaine","Autorité + SEO","Sauvegardes élevées"],
        ["Behind the scenes","1× / semaine","Humanisation de la marque","Commentaires"],
        ["Promotions & disponibilités","Ad hoc","Réservations directes","Clics profil"],
    ], cw=[44*mm,28*mm,42*mm,32*mm])

    S.append(sp(3))
    S.append(lbl("BUDGET MARKETING MENSUEL"))
    S += tbl([
        ["Poste","Coût / mois","Retour attendu"],
        ["Meta Ads (Instagram/Facebook)","200 $","40-60 nouvelles clientes / an"],
        ["Google Ads (local)","100 $","20-30 nouvelles clientes / an"],
        ["Création contenu (props, lumières)","50 $","Contenu viral organique"],
        ["Programme fidélité (rabais offerts)","100 $","Rétention 65 %+"],
        ["Partenariats / cadeaux influenceuses","50 $","Audience 10K-100K"],
        ["TOTAL MARKETING","500 $","~80-100 nouvelles clientes / an"],
    ], cw=[72*mm,32*mm,52*mm], hlt_last=True)

    # ── 8. PLAN OPÉRATIONNEL ──────────────────────────────────────────────────
    S.append(sec("8","PLAN OPÉRATIONNEL"))
    S.append(lbl("MODÈLE DE FONCTIONNEMENT"))
    for b in [
        "<b>Format :</b> Studio à domicile ou espace loué (suite dans salon existant, coworking beauté)",
        "<b>Réservation :</b> Exclusivement en ligne via site web + acompte obligatoire",
        "<b>Extensions :</b> Achetées en gros auprès de fournisseurs Aliexpress/Amazon — coût ~15-25 $ / cliente",
        "<b>Horaires :</b> Mardi–Samedi 8h30–19h, 1 cliente/jour max (service long)",
        "<b>Outils :</b> Système de réservation (Acuity ou Square), comptabilité (Wave, gratuit)",
        "<b>Hygiène :</b> Protocole de désinfection entre chaque cliente, espace épuré",
    ]:
        S.append(bl(b))

    S.append(sp(3))
    S.append(lbl("CHAÎNE D'APPROVISIONNEMENT"))
    S += tbl([
        ["Fourniture","Fournisseur recommandé","Coût unitaire","Fréquence commande"],
        ["Extensions knotless","Aliexpress / Janet Collection","15-25 $ / sac","Mensuel"],
        ["Extensions boho","Freetress / Sensationnel","18-28 $ / sac","Mensuel"],
        ["Produits soin (beurre, huile)","Distributeur local / Amazon","30-50 $ / lot","Mensuel"],
        ["Accessoires (élastiques, épingles)","Dollarama / Bulk Barn","10-15 $","Mensuel"],
        ["Équipement (peignes, peigne rat)","Sally Beauty / Amazon","Variable","Trimestriel"],
    ], cw=[42*mm,46*mm,28*mm,30*mm])

    # ── 9. RESSOURCES HUMAINES ────────────────────────────────────────────────
    S.append(sec("9","RESSOURCES HUMAINES"))
    S += tbl([
        ["Phase","Effectif","Structure","Coût masse salariale"],
        ["An 1 (Lancement)","1 (propriétaire)","Travailleuse autonome","0 $ salaire (bénéfice net)"],
        ["An 2 (Croissance)","2 (1 assistante)","Contrat / sous-traitance","1 200-1 800 $ / mois"],
        ["An 3 (Expansion)","3-4 stylistes","Studio physique + équipe","4 000-6 000 $ / mois"],
    ], cw=[28*mm,36*mm,50*mm,42*mm])
    S.append(body(
        "La croissance de l'équipe est conditionnelle à l'atteinte d'une liste d'attente "
        "régulière de plus de 30 clientes. Chaque styliste ajoutée augmente la capacité "
        "de ~250 clientes/an et génère ~65 000 $ en revenus additionnels."))

    # ── 10. PROJECTIONS FINANCIÈRES ───────────────────────────────────────────
    S.append(sec("10","PROJECTIONS FINANCIÈRES DÉTAILLÉES"))

    S.append(lbl("PRÉVISIONS MENSUELLES — AN 1"))
    S += tbl([
        ["Mois","Clientes","CA Brut","Fournitures","Marketing","Loyer","Bénéfice Net"],
        ["Janvier",  "8",  "2 080 $","300 $","400 $","700 $","680 $"],
        ["Février",  "10", "2 600 $","300 $","300 $","700 $","1 300 $"],
        ["Mars",     "14", "3 640 $","400 $","300 $","700 $","2 240 $"],
        ["Avril",    "18", "4 680 $","500 $","250 $","700 $","3 230 $"],
        ["Mai",      "20", "5 200 $","550 $","250 $","700 $","3 700 $"],
        ["Juin",     "22", "5 720 $","600 $","200 $","700 $","4 220 $"],
        ["Juillet",  "24", "6 240 $","650 $","200 $","700 $","4 690 $"],
        ["Août",     "26", "6 760 $","700 $","200 $","700 $","5 160 $"],
        ["Septembre","22", "5 720 $","600 $","250 $","700 $","4 170 $"],
        ["Octobre",  "20", "5 200 $","550 $","250 $","700 $","3 700 $"],
        ["Novembre", "18", "4 680 $","500 $","300 $","700 $","3 180 $"],
        ["Décembre", "16", "4 160 $","450 $","300 $","700 $","2 710 $"],
        ["TOTAL AN 1","218","56 680 $","6 100 $","3 200 $","8 400 $","38 980 $"],
    ], cw=[22*mm,20*mm,24*mm,24*mm,22*mm,18*mm,26*mm], hlt_last=True)
    S += info_box(
        "<b>Note :</b> Projection conservatrice (montée en puissance sur 4 mois). "
        "Le revenu moyen par cliente est de 260 $. Le loyer inclut l'espace et les "
        "charges. Les projections ne tiennent pas compte de la taxe de vente.",
        bg=BLUE_LT, border=BLUE)

    S.append(sp(3))
    S.append(lbl("SCÉNARIOS — 3 ANS"))
    S += tbl([
        ["","An 1 (1 styliste)","An 2 (2 stylistes)","An 3 (3-4 stylistes)"],
        ["Clientes / an",      "218",      "450-500",    "700-900"],
        ["Revenus bruts",      "56 680 $", "115 000 $",  "180 000 $"],
        ["Charges totales",    "17 700 $", "42 000 $",   "70 000 $"],
        ["Bénéfice net",       "38 980 $", "73 000 $",   "110 000 $"],
        ["Marge nette",        "~68 %",    "~63 %",      "~61 %"],
    ], cw=[50*mm,34*mm,36*mm,36*mm], hlt_first_col=True)

    # ── 11. POINT MORT ────────────────────────────────────────────────────────
    S.append(sec("11","POINT MORT & SEUIL DE RENTABILITÉ"))
    S.append(body(
        "Le seuil de rentabilité représente le nombre minimum de clientes nécessaires "
        "pour couvrir toutes les charges fixes mensuelles et atteindre l'équilibre financier."))
    S += tbl([
        ["Charges fixes / mois","Montant"],
        ["Loyer / espace de travail","700 $"],
        ["Assurances professionnelles","75 $"],
        ["Abonnements (booking, comptabilité)","45 $"],
        ["Marketing de base","200 $"],
        ["Divers (transport, téléphone)","80 $"],
        ["TOTAL CHARGES FIXES","1 100 $"],
    ], cw=[108*mm,48*mm], hlt_last=True)
    S.append(sp(2))
    S += stat_box([
        ("5 clientes","Point mort mensuel\n(à 220 $ / visite avg.)"),
        ("60 clientes","Point mort annuel"),
        ("Semaine 3","Atteint dès le 1er mois"),
        ("~8 mois","Remboursement investissement"),
    ])

    # ── 12. STRUCTURE LÉGALE ──────────────────────────────────────────────────
    S.append(sec("12","STRUCTURE LÉGALE & DÉMARCHES"))
    S += tbl([
        ["Démarche","Où","Coût","Délai"],
        ["Enregistrement entreprise individuelle","ServiceOntario.ca","60 $","1-3 jours"],
        ["Compte TPS/TVH (si >30 000 $)","CRA — Canada.ca","Gratuit","1-2 semaines"],
        ["Licence commerciale Ville d'Ottawa","Ottawa.ca","100 $ / an","1 semaine"],
        ["Assurance responsabilité professionnelle","Courtier local","500-900 $ / an","3-5 jours"],
        ["Compte bancaire entreprise","TD, RBC, Desjardins","0-15 $ / mois","1 jour"],
        ["Logiciel comptabilité","Wave (gratuit) / QuickBooks","0-30 $ / mois","Immédiat"],
    ], cw=[52*mm,38*mm,24*mm,22*mm])
    S.append(lbl("EXPANSION QUÉBEC (GATINEAU)"))
    for b in [
        "Enregistrement au <b>Registraire des entreprises du Québec</b> (~38 $)",
        "Vérifier les exigences du <b>Règlement sur les salons de coiffure</b> (COIFFURE Québec)",
        "TPS (5 %) + TVQ (9,975 %) applicables sur tous les services",
        "Numéro d'entreprise du Québec (NEQ) obligatoire",
    ]:
        S.append(bl(b))

    # ── 13. INVESTISSEMENT ────────────────────────────────────────────────────
    S.append(sec("13","INVESTISSEMENT DE DÉPART"))
    S += tbl([
        ["Poste","Coût min.","Coût max.","Priorité"],
        ["Équipement (chaises, miroirs, éclairage LED)","1 500 $","4 000 $","Essentiel"],
        ["Extensions & fournitures initiales (3 mois)","1 500 $","2 500 $","Essentiel"],
        ["Site web (déjà réalisé)","0 $","0 $","Fait ✓"],
        ["Branding (logo, cartes, packaging)","300 $","800 $","Important"],
        ["Photographie professionnelle","400 $","800 $","Important"],
        ["Marketing lancement (Meta Ads x 3 mois)","600 $","1 000 $","Important"],
        ["Enregistrement légal + assurances","700 $","1 100 $","Essentiel"],
        ["Logiciel réservation (1 an)","0 $","300 $","Important"],
        ["Fonds de roulement (3 mois charges)","2 500 $","3 500 $","Essentiel"],
        ["Imprévus (10 %)","750 $","1 400 $","Prudence"],
        ["TOTAL ESTIMÉ","8 250 $","15 400 $",""],
    ], cw=[72*mm,22*mm,22*mm,28*mm+6*mm], hlt_last=True)

    S.append(sp(3))
    S.append(lbl("SOURCES DE FINANCEMENT RECOMMANDÉES"))
    S += tbl([
        ["Programme","Type","Montant","Conditions"],
        ["Futurpreneur Canada","Prêt + mentorat","Jusqu'à 20 000 $","18-39 ans, plan d'affaires"],
        ["BDC — Démarrage","Prêt PME","10 000-100 000 $","Viabilité démontrable"],
        ["Starter Company Plus (ON)","Subvention","Jusqu'à 5 000 $","Formation requise"],
        ["Investissement Québec","Prêt / subvention","Variable","Si expansion QC"],
        ["Épargne personnelle","Fonds propres","Variable","Recommandé: 40 %+"],
    ], cw=[46*mm,28*mm,34*mm,48*mm])

    # ── 14. KPIs ──────────────────────────────────────────────────────────────
    S.append(sec("14","INDICATEURS DE PERFORMANCE — KPIs"))
    S += tbl([
        ["KPI","Cible Mois 3","Cible Mois 6","Cible An 1","Outil de mesure"],
        ["Revenus bruts / mois","3 500 $","5 500 $","6 500 $","Système réservation"],
        ["Nbre de clientes / mois","14","21","25","Calendrier + CRM"],
        ["Taux de retour clientes","40 %","55 %","65 %","Système réservation"],
        ["Avis Google (note moy.)","4,8 ★","4,9 ★","4,9 ★","Google Business"],
        ["Abonnées Instagram","500","1 500","3 000","Instagram Insights"],
        ["Taux de no-show","< 10 %","< 5 %","< 3 %","Calendrier"],
        ["Panier moyen","240 $","255 $","265 $","Système paiement"],
        ["Coût d'acquisition client","25 $","18 $","12 $","Marketing / nbre RDV"],
        ["NPS (bouche-à-oreille)","7/10","8/10","9/10","Sondage post-visite"],
    ], cw=[50*mm,24*mm,24*mm,22*mm,36*mm])

    # ── 15. RISQUES ───────────────────────────────────────────────────────────
    S.append(sec("15","ANALYSE DES RISQUES"))
    S += tbl([
        ["Risque","Probabilité","Impact","Stratégie de mitigation"],
        ["Blessure / maladie de la styliste","Faible","Élevé","Assurance invalidité + liste d'attente"],
        ["No-shows fréquents","Moyen","Moyen","Acompte 50 $ non remboursable"],
        ["Concurrence nouvelle","Moyen","Moyen","Fidélisation + image de marque forte"],
        ["Hausse coût des extensions","Moyen","Moyen","Stocks 3 mois, fournisseurs multiples"],
        ["Algorithme Instagram en baisse","Moyen","Moyen","Diversification : TikTok, Google, email"],
        ["Récession économique","Faible","Moyen","Offre entrée de gamme + paiements échelonnés"],
        ["Difficulté à trouver un local","Moyen","Faible","Studio maison → coworking beauté"],
        ["Burnout","Faible","Élevé","Limite 5 clientes/sem. an 1, embauche an 2"],
    ], cw=[46*mm,22*mm,18*mm,70*mm])

    # ── 16. FEUILLE DE ROUTE ──────────────────────────────────────────────────
    S.append(sec("16","FEUILLE DE ROUTE — 18 MOIS"))
    S += tbl([
        ["Période","Phase","Actions clés","Objectif financier"],
        ["Mois 1-2","Lancement",
         "Enregistrement légal · Équipement · Lancement Instagram · 10 premiers clients",
         "2 000-3 000 $ / mois"],
        ["Mois 3-4","Croissance",
         "50 avis Google · Campagne Meta Ads · Programme de fidélité · SEO local",
         "3 500-4 500 $ / mois"],
        ["Mois 5-6","Accélération",
         "150 clientes cumulées · Collaboration influenceuse · Cartes cadeaux",
         "5 000-6 000 $ / mois"],
        ["Mois 7-9","Consolidation",
         "Liste d'attente régulière · Partenariats locaux · Photographie pro",
         "6 000-7 000 $ / mois"],
        ["Mois 10-12","Expansion",
         "Embauche 1re styliste (sous-traitance) · Évaluation local Gatineau",
         "7 000-9 000 $ / mois"],
        ["Mois 13-15","Studio physique",
         "Location studio Ottawa · 2 postes de travail · Branding espacé",
         "9 000-12 000 $ / mois"],
        ["Mois 16-18","Gatineau",
         "Ouverture Gatineau (pop-up ou studio) · 3e styliste · Vente produits",
         "12 000-18 000 $ / mois"],
    ], cw=[22*mm,24*mm,66*mm,34*mm+10*mm])

    S.append(sp(6))
    S += hr(GOLD, 0.8),
    S.append(Paragraph(
        "Ce plan d'affaires est un document de travail évolutif. Les projections "
        "financières sont basées sur des données de marché disponibles en 2026 et "
        "des estimations conservatrices. Les résultats réels peuvent varier en fonction "
        "de l'exécution, de la conjoncture économique et de la croissance du marché local.",
        ParagraphStyle("disc", fontName="Helvetica-Oblique", fontSize=8,
                        leading=13, textColor=MUTED, alignment=TA_JUSTIFY)))
    S.append(sp(2))
    S.append(Paragraph(
        "HALO BRAIDS  ·  Studio de Tressage de Luxe  ·  Ottawa-Gatineau  ·  2026",
        ParagraphStyle("sign", fontName="Helvetica-Bold", fontSize=8.5,
                        textColor=GOLD_DARK, alignment=TA_CENTER)))

    doc.build(S, onFirstPage=bg_cover, onLaterPages=bg_inner)
    print(f"PDF genere : {OUTPUT}")

if __name__ == "__main__":
    build()
