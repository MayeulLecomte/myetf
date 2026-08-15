#!/usr/bin/env python3
"""
GÉNÉRATION DES ICÔNES

Redessine icone-180/192/512.png à partir du signe de l'application :
trois barres croissantes sur fond bleu, la plus haute en or.

La géométrie est celle du SVG de l'en-tête (repère de 64 × 64), pour que
l'icône, le favicon et le logo du site restent le même dessin. Le fond est
un carré plein : iOS applique lui-même son masque arrondi, et un coin déjà
arrondi dans le fichier laisserait une frange claire sur l'écran d'accueil.

Aucune dépendance : encodeur PNG écrit sur la bibliothèque standard.
Le tracé est calculé en suréchantillonnage ×4 puis moyenné, ce qui suffit
à lisser les arrondis des barres.

Usage :  python3 scripts/icones.py
"""

import struct
import zlib
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

FOND = (0x1F, 0x5A, 0xA8)     # --logo-fond
BARRE = (0xFF, 0xFF, 0xFF)    # --logo-barre
ACCENT = (0xC0, 0x8A, 0x2E)   # --logo-accent

# x, y, largeur, hauteur, rayon, couleur, opacité — repère de 64 × 64
BARRES = [
    (12.0,  34.0, 11.0, 18.0, 2.0, BARRE,  0.72),
    (26.5,  26.0, 11.0, 26.0, 2.0, BARRE,  0.86),
    (41.0,  16.0, 11.0, 36.0, 2.0, ACCENT, 1.00),
]

SUPER = 4          # facteur de suréchantillonnage
REPERE = 64.0      # côté du repère du dessin


def dans_rect_arrondi(x, y, rx, ry, w, h, r):
    """Le point (x, y) est-il dans le rectangle arrondi ?"""
    if not (rx <= x <= rx + w and ry <= y <= ry + h):
        return False
    # Hors des quatre coins, la réponse est acquise.
    cx = rx + r if x < rx + r else (rx + w - r if x > rx + w - r else None)
    cy = ry + r if y < ry + r else (ry + h - r if y > ry + h - r else None)
    if cx is None or cy is None:
        return True
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def melanger(fond, dessus, alpha):
    return tuple(round(dessus[i] * alpha + fond[i] * (1 - alpha)) for i in range(3))


def dessiner(cote):
    """Rend l'icône au format [ligne][colonne] = (r, g, b)."""
    echelle = cote / REPERE
    grand = cote * SUPER
    # Accumulateur en pleine résolution, puis moyenne par bloc de SUPER².
    lignes = []
    for py in range(cote):
        ligne = []
        for px in range(cote):
            somme = [0, 0, 0]
            for sy in range(SUPER):
                for sx in range(SUPER):
                    # Centre du sous-pixel, ramené dans le repère du dessin.
                    ux = (px * SUPER + sx + 0.5) / grand * REPERE
                    uy = (py * SUPER + sy + 0.5) / grand * REPERE
                    couleur = FOND
                    for bx, by, bw, bh, br, teinte, alpha in BARRES:
                        if dans_rect_arrondi(ux, uy, bx, by, bw, bh, br):
                            couleur = melanger(FOND, teinte, alpha)
                            break
                    for i in range(3):
                        somme[i] += couleur[i]
            n = SUPER * SUPER
            ligne.append(tuple(somme[i] // n for i in range(3)))
        lignes.append(ligne)
    return lignes


def encoder_png(lignes, chemin):
    """Écrit un PNG 8 bits RVB sans transparence."""
    hauteur = len(lignes)
    largeur = len(lignes[0])

    brut = bytearray()
    for ligne in lignes:
        brut.append(0)                      # filtre « None » pour la ligne
        for r, v, b in ligne:
            brut += bytes((r, v, b))

    def morceau(nom, donnees):
        bloc = nom + donnees
        return struct.pack('>I', len(donnees)) + bloc + struct.pack('>I', zlib.crc32(bloc))

    entete = struct.pack('>IIBBBBB', largeur, hauteur, 8, 2, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n'
           + morceau(b'IHDR', entete)
           + morceau(b'IDAT', zlib.compress(bytes(brut), 9))
           + morceau(b'IEND', b''))
    chemin.write_bytes(png)
    return len(png)


def principal():
    for cote in (180, 192, 512):
        chemin = RACINE / f'icone-{cote}.png'
        poids = encoder_png(dessiner(cote), chemin)
        print(f'{chemin.name} — {cote} × {cote}, {poids} octets')


if __name__ == '__main__':
    principal()
