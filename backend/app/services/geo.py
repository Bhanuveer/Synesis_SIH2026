"""Small geo helpers — haversine distance only, no GIS dependency needed."""
import math


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def nearby_wells(active_well, all_wells, radius_km):
    results = []
    for w in all_wells:
        if w["name"] == active_well["name"]:
            continue
        dist = haversine_km(active_well["lat"], active_well["lon"], w["lat"], w["lon"])
        if dist <= radius_km:
            w2 = dict(w)
            w2["distance_km"] = round(dist, 2)
            results.append(w2)
    results.sort(key=lambda w: w["distance_km"])
    return results


def formation_at_depth(formation_tops, depth):
    for ft in formation_tops:
        if ft["top"] <= depth <= ft["bottom"]:
            return ft["formation"]
    if formation_tops and depth > formation_tops[-1]["bottom"]:
        return formation_tops[-1]["formation"]
    return formation_tops[0]["formation"] if formation_tops else None
