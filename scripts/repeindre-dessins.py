#!/usr/bin/env python3
"""
LES DESSINS PASSENT DU BLEU AU VIOLET

Huit des seize dessins de `img/` portaient encore le #2F6BFF de l'ancien
registre — enveloppe, contexte, profil, revenus, journal, rapport, univers,
methode. Une vue sur deux ouvrait donc sur une couleur qui n'est plus celle
de l'application, à côté de sept autres déjà repeints. C'est le même défaut
que le favicon, en plus visible : deux registres pour une même page.

POURQUOI UNE TEINTE DÉPLACÉE, ET NON UN DESSIN REFAIT. Redessiner huit
illustrations, c'est prendre le risque que le trait dérive — et se
retrouver avec seize dessins dans deux styles au lieu d'une couleur en
trop. Le déplacement de teinte est déterministe : le trait ne bouge pas
d'un pixel, seule la couleur change, et le résultat se recompte.

LA CIBLE N'EST PAS UNE ROTATION DE TEINTE. Les dessins déjà repeints —
camembert, cafe — ne sont pas le bleu tourné de vingt-trois degrés : ils
sont MOINS SATURÉS, 0,59 contre 0,81. Faire tourner la seule teinte aurait
donné un violet électrique qui ne se serait accordé avec aucun d'eux. On
déplace donc la famille entière, saturation comprise, du bleu de référence
vers le violet de référence.

Les pixels de l'ENCRE — le trait noir, qui n'est pas saturé — ne sont pas
touchés, et ceux de l'anticrénelage le sont au prorata de leur saturation :
c'est ce qui garde les bords lisses.

Le script est IDEMPOTENT : après un passage, plus aucun pixel n'est dans la
fenêtre de teinte du bleu, et le relancer ne change rien. Il reste ici pour
le jour où un dessin arriverait encore en bleu.

Usage :  python3 scripts/repeindre-dessins.py [nom ...]
         sans argument, les huit dessins connus.
"""

import colorsys
import sys
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
IMG = RACINE / 'img'

DESSINS = ['enveloppe', 'contexte', 'profil', 'revenus',
           'journal', 'rapport', 'univers', 'methode']

# Les deux références, relevées sur les dessins eux-mêmes : le bleu qui
# domine les huit à repeindre, le violet qui domine ceux qui le sont déjà.
BLEU = (221 / 360, 0.806, 0.973)
VIOLET = (244 / 360, 0.592, 1.000)

# La fenêtre de teinte à déplacer. Assez large pour prendre les variantes
# d'un dessin à l'autre — de 219 à 224 degrés — sans mordre sur le cyan
# d'un côté ni sur le violet déjà posé de l'autre.
TEINTE_MIN, TEINTE_MAX = 200 / 360, 238 / 360
SATURATION_MIN = 0.12


def repeindre(image):
    """Rend l'image repeinte et le nombre de pixels déplacés."""
    pixels = list(image.getdata())
    sortie, touches = [], 0

    for r, v, b, a in pixels:
        if a == 0:
            sortie.append((r, v, b, a))
            continue
        h, s, val = colorsys.rgb_to_hsv(r / 255, v / 255, b / 255)
        if s < SATURATION_MIN or not (TEINTE_MIN <= h <= TEINTE_MAX):
            sortie.append((r, v, b, a))
            continue
        s2 = min(1.0, s * (VIOLET[1] / BLEU[1]))
        v2 = min(1.0, val * (VIOLET[2] / BLEU[2]))
        r2, v2c, b2 = colorsys.hsv_to_rgb(VIOLET[0], s2, v2)
        sortie.append((round(r2 * 255), round(v2c * 255), round(b2 * 255), a))
        touches += 1

    repeinte = Image.new('RGBA', image.size)
    repeinte.putdata(sortie)
    return repeinte, touches


def main():
    noms = sys.argv[1:] or DESSINS
    for nom in noms:
        chemin = IMG / f'{nom}.png'
        if not chemin.exists():
            print(f'{nom} : introuvable', file=sys.stderr)
            continue
        avant = chemin.stat().st_size
        repeinte, touches = repeindre(Image.open(chemin).convert('RGBA'))
        if not touches:
            print(f'{nom} : aucun pixel bleu — déjà repeint')
            continue
        repeinte.save(chemin, 'PNG', optimize=True)
        print(f'{nom} : {touches} pixels déplacés, {avant} → {chemin.stat().st_size} octets')


if __name__ == '__main__':
    main()
