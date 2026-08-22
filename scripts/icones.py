#!/usr/bin/env python3
"""
GÉNÉRATION DES ICÔNES

Redessine icone-180/192/512.png à partir de `img/logo.png` — la pousse,
c'est-à-dire le signe que l'en-tête porte depuis le chantier 9.

POURQUOI CE SCRIPT A ÉTÉ RÉÉCRIT. Il traçait les TROIS BARRES de l'ancien
signe, à partir d'une géométrie SVG recopiée à la main depuis un en-tête
qui ne l'utilise plus. Les icônes d'écran d'accueil et le favicon
montraient donc un dessin que l'application n'affiche nulle part : deux
signes pour une même application, et celui qu'on voit dans l'onglet
n'était pas celui qu'on voit dans la page.

L'icône se DÉRIVE désormais du logo au lieu d'être redessinée. C'est ce
qui garantit qu'elle ne peut plus diverger : le jour où la pousse est
redessinée, relancer ce script suffit, et il n'y a aucune géométrie à
tenir d'accord avec quoi que ce soit.

TROIS CHOIX, ET ILS SE TIENNENT :

· LE FOND EST PLEIN, ET LAVANDE. Plein parce qu'iOS applique lui-même son
  masque arrondi : un coin déjà arrondi dans le fichier laisserait une
  frange claire sur l'écran d'accueil. Lavande — `--fond`, #F3F2FE —
  parce que c'est le fond de l'application ; l'icône est alors un morceau
  de l'écran qu'elle ouvre. Un fond violet plein aurait avalé le dessin,
  qui est violet lui aussi.

· LE DESSIN EST CADRÉ SUR SON ENCRE, pas sur le fichier. `logo.png` porte
  une marge transparente irrégulière ; s'y fier décentrerait la pousse
  d'une douzaine de pixels sans que rien ne le signale. On mesure la boîte
  englobante de la couche alpha, et on centre celle-là.

· IL OCCUPE 68 % DU CÔTÉ. Une icône iOS est rognée par le masque, et un
  dessin qui touche les bords se fait manger ses extrémités. Les deux
  tiers sont la proportion habituelle ; en dessous, le signe se perd.

DÉPENDANCE : Pillow. L'ancien script écrivait son propre encodeur PNG sur
la bibliothèque standard — c'était tenable pour trois rectangles, ça ne
l'est pas pour lire un PNG existant, le décomposer et le rééchantillonner.
L'application, elle, n'a toujours aucune dépendance : ce script ne tourne
qu'ici, à la main, et rien de ce qu'il produit n'en réclame.

Usage :  python3 scripts/icones.py
"""

from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent

SOURCE = RACINE / 'img' / 'logo.png'
FOND = (0xF3, 0xF2, 0xFE, 0xFF)   # --fond, le lavande de l'application
PART = 0.68                        # part du côté occupée par le dessin
TAILLES = (180, 192, 512)


def icone(logo, cote):
    """Le logo, cadré sur son encre, centré sur un carré plein."""
    fond = Image.new('RGBA', (cote, cote), FOND)

    boite = logo.split()[3].getbbox()
    encre = logo.crop(boite)

    large = round(cote * PART)
    echelle = min(large / encre.width, large / encre.height)
    dessin = encre.resize(
        (max(1, round(encre.width * echelle)), max(1, round(encre.height * echelle))),
        Image.LANCZOS)

    fond.alpha_composite(dessin, ((cote - dessin.width) // 2, (cote - dessin.height) // 2))
    return fond


def main():
    logo = Image.open(SOURCE).convert('RGBA')
    for cote in TAILLES:
        chemin = RACINE / f'icone-{cote}.png'
        icone(logo, cote).save(chemin, 'PNG', optimize=True)
        print(f'{chemin.name} → {cote}×{cote}, {chemin.stat().st_size} octets')


if __name__ == '__main__':
    main()
