#!/usr/bin/env python3
"""Build Viya Academy seed data from 2026 enrollment + attendance trackers."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "seed.json"

# Enrollment status: current | pending | declined | pif | overdue | paused | collections
# Program: academy | subscriber | prospect
# Plan: pp | pif | subscription | none
# Photoshoot: none | scheduled | headshots | full | refresh | received
# Subscription: none | active | interested | paused | cancelled


def s(
    sid,
    first,
    last,
    *,
    status,
    plan,
    program="academy",
    phone="",
    email="",
    start="",
    amount=None,
    due="",
    age=None,
    notes="",
    photoshoot="none",
    photoshoot_notes="",
    subscription="none",
    nickname="",
    class_time="",
):
    return {
        "id": sid,
        "firstName": first,
        "lastName": last,
        "nickname": nickname,
        "email": email,
        "phone": phone,
        "age": age,
        "program": program,
        "paymentPlan": plan,
        "enrollmentStatus": status,
        "startDate": start,
        "nextPaymentDate": due,
        "nextPaymentAmount": amount,
        "notes": notes,
        "subscriptionStatus": subscription,
        "photoshootStatus": photoshoot,
        "photoshootNotes": photoshoot_notes,
        "classTime": class_time,
        "photoUrl": "",
    }


academy = [
    s("0924", "Jasondra", "Campbell", status="declined", plan="pp", phone="404-502-0282", email="bspgalz@gmail.com", start="2026-07-11", amount=125, due="2026-07-24", age=34, notes="$125 due 07/24. Payment was unable to process as of 07/31. Textla and Square reminder sent 08/08. Payment declined 08/26."),
    s("0579", "Makyla", "Saulsberry", status="declined", plan="pp", phone="602-873-8115", email="redpip21@gmail.com", start="2026-04-18", amount=104, due="2026-08-07", notes="$104 due 08/07. Textla and Square reminder sent 08/07. Payment declined 08/26."),
    s("0202", "Darrell", "Smith", status="overdue", plan="pp", phone="480-996-1020", email="darrellsmith3272@gmail.com", start="2025-10-04", amount=78, due="2026-08-10", age=23, notes="$78 due 08/10. Reminder sent 08/10. No payment made 08/26."),
    s("0206", "Alajanae", "Walker", status="overdue", plan="pp", phone="502-802-9496", email="alajanaemarie@gmail.com", start="2025-10-04", amount=78, due="2026-08-10", age=23, notes="$78 due 08/10. Reminder sent 08/10. No payment made 08/26."),
    s("0749", "Chayah", "Israel", status="overdue", plan="pp", phone="602-813-6675", email="choks.subscriptions@gmail.com", amount=50, due="2026-08-14", notes="$50 due 08/14. Textla and Square reminder sent 08/14. No payment made 08/26. Sent text AH."),
    s("0938", "Christian", "Barr", status="overdue", plan="pp", phone="575-654-5773", email="barrchristian75@gmail.com", start="2026-07-08", amount=104, due="2026-08-21", notes="$104 due 08/21. No payment made 08/26."),
    s("1095", "Alexa", "Cruz Rosas", status="pending", plan="pp", phone="480-370-0624", email="fercrosas21@gmail.com", start="2026-09-05", amount=300, due="2026-09-05", age=22, notes="Deposit $300 due 09/05. Then $104 due 09/18."),
    s("1017", "Liam", "St Spell", status="pending", plan="pp", phone="480-578-5560", email="liamstspell@gmail.com", start="2026-07-29", amount=300, due="2026-09-11", age=32, notes="Deposit $300 due 09/11. Then $104 due 09/25."),
    s("1096", "Almaz", "Lee", status="pending", plan="pp", phone="602-402-2260", email="maze.lee28@gmail.com", start="2026-09-12", amount=300, due="2026-09-05", age=21, notes="Deposit $300 due 09/05. Then $104 due 09/18."),
    s("0471", "Randall", "Jubilee", status="paused", plan="pp", phone="702-908-1361", email="randalljubileeiii@gmail.com", start="2026-02-14", amount=104, due="2026-10-02", age=26, notes="Paused until $104 due 10/02."),
    s("0842", "Nyagach", "Thuok", status="paused", plan="pp", phone="507-213-3294", email="nthuok@gmail.com", start="2026-05-23", amount=104, due="2026-09-04", age=24, notes="Paused until $104 due 09/04."),
    s("0392", "Jaime", "Garcia", status="current", plan="pp", phone="480-519-3387", email="surgarcia666@gmail.com", start="2026-02-05", age=20),
    s("0521", "Chad", "Broadie Jr", status="current", plan="pp", phone="619-381-2038", email="chadjr98@yahoo.com", start="2026-05-23", amount=104, due="2026-08-28"),
    s("0935", "James", "Strysko", status="current", plan="pp", phone="480-478-5751", email="jastrysko@gmail.com", start="2026-07-11", amount=104, due="2026-08-28", subscription="interested", notes="Checked in as Subscriber on 08/26."),
    s("1078", "Fernando", "Gutierrez", status="current", plan="pp", phone="602-301-0195", email="fernando2003live@gmail.com", start="2026-08-22", amount=104, due="2026-09-04", age=23),
    s("0917", "Natalie", "Hanania", status="current", plan="pp", phone="520-510-8005", email="nataliehtalent@gmail.com", start="2026-07-01", amount=104, due="2026-08-28", age=21),
    s("1079", "Lilliana", "Fernandez", status="current", plan="pp", phone="562-313-1887", email="reyna_alcantar22@yahoo.com", start="2026-08-15", amount=104, due="2026-08-28", age=15, notes="Checked in 08/26 for Modeling. Phone on check-in form: (623) 341-0249."),
    s("0921", "April", "Wilson", status="current", plan="pp", phone="520-342-4177", email="aprildionne3@gmail.com", start="2026-06-27", amount=103, due="2026-09-04", age=54),
    s("1003", "Picasso", "Dular", status="current", plan="pp", phone="773-960-7458", email="picassodular@gmail.com", start="2026-07-08", amount=103, due="2026-08-28"),
    s("1007", "Kemontae", "Iyamu", status="current", plan="pp", phone="480-359-8637", email="iyamukemontae39@gmail.com", start="2026-07-15", amount=104, due="2026-08-28", age=23),
    s("1080", "Jamison", "Floyd", status="current", plan="pp", phone="480-773-8688", email="floydfam2008@gmail.com", start="2026-08-12", amount=104, due="2026-08-28", age=14),
    s("1006", "Tre", "Amparan", status="current", plan="pp", phone="602-769-7265", email="tre.amparan@gmail.com", start="2026-07-22", amount=103, due="2026-09-04", age=25),
    s("0918", "Ivan", "Parker", status="current", plan="pp", phone="251-487-4948", email="ivanparker2k18@gmail.com", start="2026-07-01", amount=100, due="2026-08-28", age=39),
    s("1004", "Orlando", "Orozco", status="current", plan="pp", phone="308-325-2264", email="orozcoorlando904@gmail.com", start="2026-07-11", amount=104, due="2026-09-04", age=23),
    s("0929", "Cuatro", "Fluker", status="current", plan="pp", phone="210-965-9902", email="cuatrofluker@gmail.com", start="2026-07-11", amount=60, due="2026-09-04", age=22),
    s("0936", "Jonathan", "Tanner", status="current", plan="pp", phone="623-236-6866", email="hansontaner150@gmail.com", start="2026-07-08", amount=104, due="2026-09-11"),
    s("0730", "Itati", "Alcantar", status="current", plan="pp", phone="520-280-3913", email="itati.a@yahoo.com", start="2026-04-18", amount=104, due="2026-09-04", age=25),
    s("0627", "Sadie", "Horsley", status="current", plan="pp", phone="602-814-7874", email="horsley.sadie2008@gmail.com", start="2026-04-01", amount=50, due="2026-08-28", age=17),
    s("1005", "Ruth", "Brooks", status="current", plan="pp", phone="702-929-1766", email="brooksruth2022@gmail.com", start="2026-07-08", amount=104, due="2026-09-04", age=22),
    s("1008", "Steven", "Babcock", status="current", plan="pp", phone="520-510-3340", email="steven.c.babcock789@gmail.com", start="2026-07-08", amount=104, due="2026-09-04", age=35),
    s("0911", "Marcus", "Baca", status="current", plan="pp", phone="505-948-1359", email="marcusbaca26@gmail.com", start="2026-06-17", amount=104, due="2026-08-28", age=21),
    s("0555", "Kenia", "Cerna", status="current", plan="pp", phone="602-338-0433", email="kencerna15@gmail.com", start="2026-06-06", amount=104, due="2026-09-04", age=24),
    s("0556", "Aylinn", "Fernandez", status="current", plan="pp", phone="480-876-8840", email="aylinnf@icloud.com", start="2026-06-13", amount=104, due="2026-09-14", age=19),
    s("0625", "Ellie", "Harris", status="current", plan="pp", phone="623-521-5578", email="eharris1227@icloud.com", start="2026-04-01", amount=78, due="2026-08-28", age=18, notes="Listed as Harris Ellie on enrollment sheet."),
    s("0522", "Frederick", "Thompson", status="current", plan="pp", phone="480-261-4045", email="tylerthmpsn@outlook.com", start="2026-05-23", amount=104, due="2026-08-28", nickname="Tyler", notes="Checks in as Tyler Thompson."),
    s("0845", "Genesis", "Soto", status="current", plan="pp", phone="480-516-4607", email="hennessyvs75@gmail.com", start="2026-06-06", amount=104, due="2026-09-04", age=20),
    s("0830", "Abril", "Becerra", status="current", plan="pp", phone="623-213-1611", email="becerraloulou@gmail.com", start="2026-05-09", amount=104, due="2026-08-28", age=22),
    s("0735", "Jacob", "Haskin", status="current", plan="pp", phone="907-750-1994", email="haskinjacob72@gmail.com", start="2026-04-22", amount=60, due="2026-08-28", age=20),
    s("0916", "Gabriel", "Anderson", status="current", plan="pp", phone="520-350-4455", email="gabby.anderson.89@gmail.com", start="2026-06-20", amount=104, due="2026-09-04", age=37, nickname="Gabby", subscription="interested", notes="Student is interested in subscription."),
    s("0729", "Aaliyah", "Moore", status="current", plan="pp", phone="715-559-9839", email="aa.roman.2720@gmail.com", start="2026-04-18", amount=104, due="2026-08-28", age=23),
    s("0731", "Catherine", "Conder", status="pif", plan="pif", phone="317-703-0705", email="catherine.conder@gmail.com", start="2026-04-22"),
    s("1093", "Brian", "Neves", status="pending", plan="pif", phone="757-404-2648", email="btaylorn98@gmail.com", start="2026-08-29", amount=927, due="2026-09-05", age=28, notes="Deposit $927 due 09/05."),
    s("1094", "Hailee", "Bui", status="pending", plan="pif", phone="602-549-7574", email="haileebui8@gmail.com", start="2026-08-29", amount=927, due="2026-09-05", age=15, notes="Deposit $927 due 09/05."),
    s("VA-4401", "Minh Thu", "Nguyen", status="pif", plan="pif", phone="858-956-9078", email="mtnguyes2000@gmail.com", start="2026-08-29"),
    s("1091", "Endy", "Dixon", status="pif", plan="pif", phone="623-466-4222", email="endypd10@gmail.com", start="2026-08-19", age=18),
    s("1076", "Ailiyah", "Mercado", status="pif", plan="pif", phone="480-363-1939", email="carranzatara@gmail.com", start="2026-08-15", age=16),
    s("1090", "Starr", "Hardin", status="pif", plan="pif", phone="310-990-9337", email="starr.hardin2@gmail.com", start="2026-08-15", age=37),
    s("1016", "Kyana Ray", "Robles", status="pif", plan="pif", phone="520-729-7069", email="krayrobles10@gmail.com", start="2026-08-01", age=29),
    s("1020", "Keilidh", "Gerity", status="pif", plan="pif", phone="602-740-9009", email="mgerity@ig-law.com", start="2026-08-01"),
    s("1077", "Ixchel", "Harguess", status="pif", plan="pif", phone="602-526-8727", email="iharguess@gmail.com", start="2026-08-22", age=17),
    s("0724", "Brylee", "Sutton", status="pif", plan="pif", phone="623-225-9303", email="bryleesutton6@gmail.com", start="2026-04-08", age=26),
    s("0412", "Megan", "Sherrard", status="pif", plan="pif", phone="817-739-5477", email="megan_sherrard1@baylor.edu", start="2026-02-11"),
    s("0621", "Emmanuel", "Harrison", status="pif", plan="pif", phone="605-595-8141", email="mannyharri@gmail.com", start="2026-04-01"),
    s("0923", "Griffin", "Van Drunen", status="pif", plan="pif", phone="480-235-1294", email="vandrunen.griffin@gmail.com", start="2026-07-11", age=39, subscription="interested", notes="Subs email sends out 09/01."),
    s("0907", "Rhiann", "Phillips", status="pif", plan="pif", phone="928-606-8386", email="rhiannleadawn@gmail.com", start="2026-06-13", age=24),
    s("0557", "Journey", "LaJeunesse", status="pif", plan="pif", phone="928-582-1842", email="jmomnaz@gmail.com", start="2026-06-13", age=18),
    s("0733", "Jessica", "Lee", status="pif", plan="pif", phone="480-826-5108", email="Jl0fb@yahoo.com", start="2026-04-18", age=32),
    s("0501", "Tucker", "Fordyce", status="pif", plan="pif", phone="480-678-5253", email="andrewtuckerfordyce@gmail.com", start="2026-03-14", age=32, nickname="Andrew", notes="Checks in as Andrew Fordyce for Acting."),
    s("0719", "Elizabeth", "Call", status="pif", plan="pif", phone="360-812-1740", email="callellie66@gmail.com", start="2026-04-11", age=21),
    s("0720", "Gabriel", "Piñeira", status="pif", plan="pif", phone="602-578-3874", email="gabepine2006@gmail.com", start="2026-04-11", age=19),
    s("0523", "Andrew", "Wilson", status="pif", plan="pif", phone="480-639-7273", email="a.wilson.rylee@gmail.com", start="2026-06-06", age=25),
    s("0620", "Thea", "Cartier", status="pif", plan="pif", phone="602-540-3980", email="theacartier00@gmail.com", start="2026-03-18", age=26),
    s("VA-4402", "Elaine", "Medeins", status="pif", plan="pif", phone="602-810-2040", email="elaine@wherehopelives.org", start="2026-04-01"),
    s("0624", "Jordyn", "Vasquez", status="pif", plan="pif", phone="480-843-1507", email="vasquezjordyn@gmail.com", start="2026-04-01", age=25),
    s("0844", "Katherine", "Sanchez", status="pif", plan="pif", phone="480-812-5997", email="kathesanrodri99@gmail.com", start="2026-05-20", age=30),
    s("0516", "Landon", "Flenniken", status="pif", plan="pif", phone="714-916-4217", email="flenniken.toni@gmail.com", start="2026-05-27", age=17),
    s("0517", "Allyson", "Ceron", status="pif", plan="pif", phone="602-703-0835", email="allysonceronofficial@gmail.com", start="2026-05-27", age=22, notes="Will be absent between June 15th and August 14th."),
    s("0520", "Natalie", "Vanderwerff", status="pif", plan="pif", phone="262-581-6745", email="natvanderwerff17@gmail.com", start="2026-05-27"),
    s("0617", "Gabriel", "Garcia", status="pif", plan="pif", phone="520-560-0064", email="ggarcia1196@gmail.com", start="2026-04-08", age=29),
    s("0910", "Niya", "Edwards", status="pif", plan="pif", phone="480-577-9840", email="aenomin@yahoo.com", start="2026-06-17", age=27),
    s("0912", "Theressa", "Duke", status="pif", plan="pif", phone="937-422-6715", email="theressa.theressa@yahoo.com", start="2026-06-13", age=25),
    s("0914", "Jackson", "Hairston", status="pif", plan="pif", phone="480-406-7345", email="jacksonhairston@icloud.com", start="2026-06-10"),
    s("0583", "Melissa", "Flores", status="pif", plan="pif", phone="602-643-6495", email="assilemflores89@gmail.com", start="2026-03-18", age=36, subscription="interested", notes="Add into subs."),
    s("0475", "Eduardo", "Cardenas", status="collections", plan="pp", phone="805-709-6497", email="eddiez07@hotmail.com", start="2026-02-14", amount=104, due="2026-06-05", age=39, notes="Collections sent 07/06. Multiple Square and Textla reminders June 5–22. No payment made 08/26."),
    s("0582", "Modesty", "Montoya", status="collections", plan="pp", phone="928-274-3233", email="Modesty7195@gmail.com", start="2026-03-18", amount=104, due="2026-06-05", age=30, notes="Collections sent 07/06. Square and Textla reminders through 06/22. No payment made 08/26."),
    s("0609", "Chris", "Hohenstatt", status="collections", plan="pp", phone="224-374-3433", email="chrishohenstatt@gmail.com", start="2026-03-18", amount=104, due="2026-06-07", age=30, notes="Collections sent 07/06. Square and Textla reminders through 06/22."),
    s("0610", "Morgan", "Slim", status="collections", plan="pp", phone="602-614-9350", email="junb3rrygreens@gmail.com", start="2026-04-22", amount=50, due="2026-06-12", age=21, notes="Collections sent 07/06. $50 due. No payment made 08/26."),
    s("0365", "Michaela", "Bartkow", status="collections", plan="pp", phone="602-460-4273", email="theemichmaster@gmail.com", start="2026-01-28", amount=100, due="2026-08-01", age=20, notes="$100 cancellation fee for August 1st. Payment declined 08/26. Collections sent 08/08."),
    s("0931", "Jasmine", "Perezsanchez", status="collections", plan="pif", phone="623-500-1228", email="perezsanchezjasmine22@gmail.com", start="2026-07-11", amount=750, due="2026-07-11", age=25, notes="Cash payment $750 due 07/11. No payment recorded as of 08/26. Collections sent 08/08."),
    s("0722", "Joshuah", "Jones", status="collections", plan="pp", phone="731-796-7839", email="j.djones5002@gmail.com", start="2026-04-11", amount=104, due="2026-08-07", age=20, notes="Paused until $104 due 08/07. Textla and Square reminder sent 08/07. Payment declined 08/26. Collections sent 08/07."),
]

subscribers = [
    s("0650", "Adam", "Montoya", status="current", plan="subscription", program="subscriber", phone="623-205-4668", email="carrie.montoya@icloud.com", due="2026-04-01", subscription="active"),
    s("0695", "Adana", "Venegas", status="current", plan="subscription", program="subscriber", phone="480-689-3554", email="adanavenegas7@gmail.com", due="2026-04-01", subscription="active"),
    s("0647", "Ailen", "Gallegos", status="current", plan="subscription", program="subscriber", email="rosaaliiciia42@gmail.com", due="2026-04-01", subscription="active", notes="Keep at 5."),
    s("0709", "Ariel", "Gonzalez", status="current", plan="subscription", program="subscriber", phone="602-813-6065", email="aigonzalez5743@gmail.com", due="2026-04-01", subscription="active"),
    s("0634", "Avarie", "Lienhart", status="current", plan="subscription", program="subscriber", phone="623-734-0133", email="darylwatzek@gmail.com", due="2026-04-01", subscription="active"),
    s("0714", "Brieanna", "Scott", status="current", plan="subscription", program="subscriber", phone="281-732-6507", email="bvamzn@yahoo.com", due="2026-04-01", subscription="active"),
    s("0645", "Bristol", "Hughes", status="current", plan="subscription", program="subscriber", phone="928-848-8717", email="cariehughes1@gmail.com", due="2026-04-01", subscription="active"),
    s("0678", "Brittany", "Catalan", status="current", plan="subscription", program="subscriber", phone="908-644-3742", email="bcatalan12@gmail.com", due="2026-04-01", subscription="active"),
    s("0666", "Cassondra", "Turner", status="current", plan="subscription", program="subscriber", phone="480-761-1029", email="mturner148@yahoo.com", due="2026-04-01", subscription="active"),
    s("0702", "Celine", "Bahdouch", status="current", plan="subscription", program="subscriber", phone="602-687-0744", email="nivinesakkal@hotmail.com", due="2026-04-01", subscription="active", notes="Checked in 08/26 as Modeling. Check-in phone (602) 821-3113."),
    s("0654", "Cheylo", "Rallis", status="current", plan="subscription", program="subscriber", phone="615-706-0552", email="cherall@icloud.com", due="2026-04-01", subscription="active"),
    s("0682", "Crescent", "Brewer", status="current", plan="subscription", program="subscriber", phone="480-740-3996", email="angel.brewer445@gmail.com", due="2026-04-01", subscription="active", nickname="Angel"),
    s("0636", "Dianica", "Vargas", status="current", plan="subscription", program="subscriber", phone="623-203-2868", email="dnh627@gmail.com", due="2026-04-01", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0746", "Jacelyn", "Dirksmeyer", status="current", plan="subscription", program="subscriber", phone="480-436-1332", email="tinadirksmeyer@gmail.com", due="2026-05-01", subscription="active", photoshoot="scheduled", photoshoot_notes="Going to June photoshoot."),
    s("0675", "Elena", "Seisinger", status="current", plan="subscription", program="subscriber", phone="480-459-1282", email="noemis1282@gmail.com", due="2026-04-01", subscription="active"),
    s("0713", "Elisabeth", "Gregory", status="current", plan="subscription", program="subscriber", phone="850-776-1442", email="elisabethbgregory@hotmail.com", due="2026-04-01", subscription="active"),
    s("0694", "Emily", "Hernandez", status="current", plan="subscription", program="subscriber", phone="520-392-0888", email="emilyh22404@gmail.com", due="2026-04-01", subscription="active"),
    s("0704", "Faith", "O'Brien", status="current", plan="subscription", program="subscriber", phone="218-591-3690", email="June.e.obrien3.ctr@army.mil", due="2026-04-01", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0633", "Fynlie", "Lienhart", status="current", plan="subscription", program="subscriber", phone="623-734-0133", email="darylwatzek@gmail.com", due="2026-04-01", subscription="active"),
    s("0664", "Gladiola", "Rubio-Munoz", status="current", plan="subscription", program="subscriber", phone="859-552-9096", email="gk.rubio.designs@gmail.com", due="2026-05-01", subscription="active"),
    s("0710", "Grace", "Boening", status="current", plan="subscription", program="subscriber", phone="517-204-6658", email="loloboening@gmail.com", due="2026-04-01", subscription="active"),
    s("0680", "Haven", "Arney", status="current", plan="subscription", program="subscriber", phone="928-228-8707", email="dawnymariearney@gmail.com", due="2026-04-01", subscription="interested", notes="Spoke with Dawn (mother). Haven 928-940-0947 is interested in subscription. Texted Haven."),
    s("0718", "Jacob", "Lubin", status="current", plan="subscription", program="subscriber", phone="703-509-8003", email="jlubin6000@gmail.com", due="2026-04-01", subscription="active"),
    s("0665", "Jade", "Roberson", status="current", plan="subscription", program="subscriber", phone="725-777-6554", email="heidi780610@yahoo.com", due="2026-04-01", subscription="active"),
    s("0673", "Jasmine", "Vasquez", status="current", plan="subscription", program="subscriber", phone="602-583-9300", email="krystalsjk4@gmail.com", due="2026-04-01", subscription="active"),
    s("0690", "Joanna", "Garcia", status="current", plan="subscription", program="subscriber", phone="626-324-7704", email="joannagarcia1229@icloud.com", due="2026-04-01", subscription="active"),
    s("0742", "Kenna", "Jones", status="current", plan="subscription", program="subscriber", phone="602-814-2080", email="kenna.jones04@gmail.com", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0658", "Joselyne", "Woosley", status="current", plan="subscription", program="subscriber", phone="918-282-8048", email="joselynewoosley@gmail.com", due="2026-04-01", subscription="active"),
    s("0685", "Joshua", "Breslin", status="current", plan="subscription", program="subscriber", phone="623-252-7223", email="gbreslin623@gmail.com", due="2026-04-01", subscription="active"),
    s("0699", "Justice", "Belcher", status="current", plan="subscription", program="subscriber", phone="480-547-5297", email="belcheramber96@gmail.com", due="2026-04-01", subscription="active"),
    s("0684", "Kaley", "Houghton", status="current", plan="subscription", program="subscriber", phone="520-306-7870", email="kaley.m91@gmail.com", due="2026-04-01", subscription="active"),
    s("0668", "Karissa", "Sendlak", status="current", plan="subscription", program="subscriber", phone="520-449-0232", email="sendlakkarissa@gmail.com", due="2026-04-01", subscription="active"),
    s("0670", "Kate", "Casetta", status="current", plan="subscription", program="subscriber", phone="623-687-8794", email="jcasetta@yahoo.com", due="2026-04-01", subscription="active"),
    s("0717", "Kayliegh", "Mckenzie", status="current", plan="subscription", program="subscriber", phone="480-469-6352", email="slumberkitty@icloud.com", due="2026-04-01", subscription="active"),
    s("0711", "Keyla", "Alvarado", status="current", plan="subscription", program="subscriber", phone="602-418-6422", email="ornelascow@gmail.com", due="2026-04-01", subscription="active"),
    s("0687", "Kiarra", "Mulkey", status="current", plan="subscription", program="subscriber", phone="480-980-4513", email="kiarramulkey3@gmail.com", due="2026-04-01", subscription="active"),
    s("0530", "Erin", "Kiker", status="current", plan="subscription", program="subscriber", phone="602-525-4810", email="erinkiker@ymail.com", due="2026-06-01", subscription="active", photoshoot="headshots", photoshoot_notes="Headshots received."),
    s("0548", "Natalie", "Kozenczak", status="current", plan="subscription", program="subscriber", phone="224-612-1402", email="nataliejhk8113@gmail.com", due="2026-06-01", subscription="active"),
    s("0672", "Kyngtavien", "Parker", status="current", plan="subscription", program="subscriber", phone="602-860-0201", email="actkyngtavion@gmail.com", due="2026-04-01", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0662", "Larry", "Brown", status="current", plan="subscription", program="subscriber", phone="602-518-5470", email="xhalekc@gmail.com", due="2026-04-01", subscription="active", photoshoot="refresh", photoshoot_notes="Refresh shoot."),
    s("0700", "Lilah", "Hill", status="current", plan="subscription", program="subscriber", phone="805-286-6455", email="phill1778@gmail.com", due="2026-04-01", subscription="active"),
    s("0705", "Liliana", "Aguilar", status="current", plan="subscription", program="subscriber", phone="901-337-0914", email="meesha.aguilar@yahoo.com", due="2026-04-01", subscription="active"),
    s("0646", "Lucas", "Sanders", status="current", plan="subscription", program="subscriber", phone="602-332-2545", email="tmsanders0224@gmail.com", due="2026-04-01", subscription="active"),
    s("0655", "Megan", "Kelsey", status="current", plan="subscription", program="subscriber", phone="928-273-7429", email="kelseypartyof5@yahoo.com", due="2026-04-01", subscription="active"),
    s("0659", "Nathaly", "Lorenzo", status="current", plan="subscription", program="subscriber", phone="602-489-2245", email="yanisbel0701@gmail.com", due="2026-04-01", subscription="active"),
    s("0686", "Ndey", "Camara", status="current", plan="subscription", program="subscriber", phone="602-849-4670", email="kumbis1980@gmail.com", due="2026-04-01", subscription="active"),
    s("0693", "Nehemiah", "Chidester-Mendoza", status="current", plan="subscription", program="subscriber", phone="602-405-4325", email="chidestermendoza@gmail.com", due="2026-04-01", subscription="active"),
    s("0667", "Noelle", "Shimmin", status="current", plan="subscription", program="subscriber", phone="507-358-5094", email="majikellie@gmail.com", due="2026-04-01", subscription="active"),
    s("0656", "Patrick", "Montgomery", status="current", plan="subscription", program="subscriber", phone="602-318-0515", email="katehmontgomery@cox.net", due="2026-04-01", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0649", "Sadie", "Aschebrock", status="current", plan="subscription", program="subscriber", phone="623-340-7140", email="sylph182@gmail.com", due="2026-04-01", subscription="active"),
    s("0637", "Sara", "Bodeke", status="current", plan="subscription", program="subscriber", phone="480-676-8263", email="joshi.nilam24@gmail.com", due="2026-04-01", subscription="active"),
    s("0779", "Parker", "Schackart", status="current", plan="subscription", program="subscriber", phone="480-787-8675", email="parker.schackart04@gmail.com", subscription="active", notes="Secondary email: schackart5@gmail.com"),
    s("0641", "Skyler", "Weaver", status="current", plan="subscription", program="subscriber", phone="480-815-2519", email="trinajo2012@gmail.com", due="2026-04-01", subscription="active"),
    s("0752", "Sunday", "Smith", status="current", plan="subscription", program="subscriber", phone="951-473-6787", email="mrs.soniamsmith@gmail.com", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0631", "Stacey", "Boucher", status="current", plan="subscription", program="subscriber", email="staceyb60@gmail.com", due="2026-04-01", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0661", "Terry Jr", "Smith", status="current", plan="subscription", program="subscriber", phone="602-502-8086", email="michaelasmith122012@gmail.com", due="2026-04-01", subscription="active"),
    s("0674", "Vincent", "Cook", status="current", plan="subscription", program="subscriber", phone="623-512-8085", email="ladycook1@cox.net", due="2026-04-01", subscription="active"),
    s("0751", "Gabriel", "Williams", status="current", plan="subscription", program="subscriber", phone="314-699-0028", email="319.dow@gmail.com", subscription="active", photoshoot="full", photoshoot_notes="Full photoshoot received."),
    s("0697", "Xavier", "Mondragon", status="current", plan="subscription", program="subscriber", phone="623-233-9498", email="bri31086@gmail.com", due="2026-04-01", subscription="active"),
    s("0920", "Matt", "Giles", status="current", plan="subscription", program="subscriber", phone="602-203-3279", email="mgiles113@gmail.com", due="2026-07-01", subscription="active"),
    s("0926", "Tacheena", "Coicou", status="current", plan="subscription", program="subscriber", phone="480-462-9377", email="coicoutacheena@gmail.com", subscription="active"),
    s("0913", "Noah", "Martin", status="current", plan="subscription", program="subscriber", phone="480-390-2257", email="namartin450@gmail.com", due="2026-07-01", subscription="active"),
    s("0925", "Brooke", "Vargas", status="current", plan="subscription", program="subscriber", phone="623-203-2868", email="dnh627@gmail.com", due="2026-07-01", subscription="active"),
    s("0927", "Tia", "Fed", status="current", plan="subscription", program="subscriber", phone="480-295-2760", email="tiafed319@icloud.com", due="2026-07-01", subscription="active"),
    s("0932", "Daniela", "Morales", status="current", plan="subscription", program="subscriber", phone="623-387-3907", email="3083mine@gmail.com", due="2026-07-01", subscription="active"),
    s("0934", "Gabriella", "Mercado", status="current", plan="subscription", program="subscriber", phone="503-278-2497", email="gabriellanmercado@gmail.com", due="2026-07-01", subscription="active"),
    s("0939", "Jay", "Murillo Lopez", status="current", plan="subscription", program="subscriber", phone="602-785-7126", email="jayfmurillolopez@gmail.com", subscription="active"),
    s("0940", "Sophia", "Scott", status="current", plan="subscription", program="subscriber", phone="714-917-9190", email="eniebla68@gmail.com", due="2026-07-01", subscription="active"),
    s("0584", "Gabriela", "Weber", status="current", plan="subscription", program="subscriber", phone="407-943-4987", email="gweber94@hotmail.com", subscription="active"),
    s("1010", "Herberto", "Avila", status="current", plan="subscription", program="subscriber", phone="928-495-7605", email="herbertoavila23@gmail.com", due="2026-08-01", subscription="active"),
    s("0628", "Athan", "Bonilla", status="current", plan="subscription", program="subscriber", phone="520-429-6797", email="Norma.turinoaz@gmail.com", due="2026-08-01", subscription="active"),
    s("0500", "Pilipo", "Warren", status="current", plan="subscription", program="subscriber", phone="520-759-6617", email="wpilipo@gmail.com", due="2026-08-01", subscription="active"),
    s("1009", "Shaniya", "Hargrave", status="overdue", plan="subscription", program="subscriber", phone="318-350-8751", email="shaniyamoneahargrave@gmail.com", due="2026-08-01", subscription="active"),
    s("1011", "Alexander", "Barrientos", status="overdue", plan="subscription", program="subscriber", phone="480-469-3438", email="bookings.atlan@gmail.com", due="2026-08-01", subscription="active"),
    s("0484", "Diego", "Colon", status="overdue", plan="subscription", program="subscriber", phone="939-335-7011", email="diegoacolon02@gmail.com", due="2026-08-01", subscription="active"),
    s("0933", "Nevaeh", "Hall", status="overdue", plan="subscription", program="subscriber", phone="520-548-2426", email="ahall9709@gmail.com", due="2026-07-01", subscription="active", notes="Secondary phone 520-977-1217."),
    s("0930", "Mikayla", "Evans", status="pending", plan="subscription", program="subscriber", phone="928-322-3017", email="mikayla.evans68@gmail.com", due="2026-10-01", subscription="pending"),
    s("0915", "Johnny", "Dang", status="pending", plan="subscription", program="subscriber", phone="623-500-9190", email="jdang7306@gmail.com", due="2026-10-01", subscription="pending"),
]

# Fix Mikayla subscription status - "pending" isn't in the type, use interested or none
# I'll use a custom - actually I used subscription="pending". Change to "interested" in post.

prospects = [
    s("PS-01", "Akira", "Singh", status="pending", plan="none", program="prospect", phone="480-789-9882", email="akirasingh363@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-02", "Aliza", "Benitez", status="pending", plan="none", program="prospect", phone="480-251-8057", email="alizabeni24@hotmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-03", "Alyssa", "Cooper", status="pending", plan="none", program="prospect", phone="480-453-4237", email="ajcjack8599@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-04", "Andreanna", "Vallejos", status="pending", plan="none", program="prospect", phone="505-427-1746", email="akvallejos@mail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-05", "Angelica", "Urrego", status="pending", plan="none", program="prospect", phone="480-278-4089", email="angeu.mgmt@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-06", "Aurora", "Madore", status="pending", plan="none", program="prospect", phone="928-613-8343", email="kristin.durning@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-07", "Candence", "Valenzuela", status="pending", plan="none", program="prospect", phone="623-276-6528", email="luckycandies333@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-08", "Carmina", "Busch", status="pending", plan="none", program="prospect", phone="575-635-5215", email="faye.busch02@yahoo.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-09", "Dionte", "Garcia", status="pending", plan="none", program="prospect", phone="720-965-7441", email="diontegarcia35@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-10", "Divine", "Kungwa", status="current", plan="subscription", program="subscriber", phone="480-803-8095", email="divinekungwa15@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list. Checked in 08/26 as Subscriber. Secondary 602-402-3567.", subscription="active"),
    s("PS-11", "Emily", "Rist", status="pending", plan="none", program="prospect", phone="614-312-4141", email="eristdancer@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-12", "Evelyn", "Bresanhan", status="pending", plan="none", program="prospect", phone="207-230-4692", email="e.w.b4115@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-13", "Hadlea", "Rostad", status="pending", plan="none", program="prospect", phone="406-529-6802", email="hadlearostad@outlook.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-14", "Heather", "Habenicht", status="pending", plan="none", program="prospect", phone="480-458-7156", email="habenichtheather@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-15", "Isabella", "Moyte", status="pending", plan="none", program="prospect", phone="928-241-3699", email="isabellamoyte@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-16", "Julissa", "Baeza Perez", status="pending", plan="none", program="prospect", phone="480-823-6407", email="Julissapb03@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-17", "Karter", "Smiley", status="pending", plan="none", program="prospect", phone="623-696-6046", email="makayla.nunlee@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-18", "Kylie", "Lewis", status="pending", plan="none", program="prospect", phone="480-319-3348", email="cthcprincess3@yahoo.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-19", "Leah", "Johnson", status="pending", plan="none", program="prospect", phone="602-203-6244", email="leahjohnsonlr07@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-20", "Lily", "Williams", status="pending", plan="none", program="prospect", phone="817-522-6140", email="lilylove10@icloud.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-21", "Lynnda", "Kincade", status="pending", plan="none", program="prospect", phone="928-699-9890", email="lovepeacehappiness134@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-22", "Makenna", "Evans", status="pending", plan="none", program="prospect", phone="480-259-9878", email="makennaevans333@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-23", "Malaika", "Jones", status="current", plan="subscription", program="subscriber", phone="480-228-1756", email="malaikajones45@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list. Checked in 08/26 as Subscriber. Check-in phone (520) 701-2068.", subscription="active"),
    s("PS-24", "Saniya", "Bynum-Russell", status="pending", plan="none", program="prospect", phone="480-791-6493", email="sammbynumrussell@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list.", nickname="Samm"),
    s("PS-25", "Sienna", "Bautista", status="pending", plan="none", program="prospect", phone="623-217-7500", email="Renee.lopez@rocketmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-26", "Xazariona", "Clements", status="pending", plan="none", program="prospect", phone="330-313-4315", email="xazariona@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("PS-27", "Zavenda", "Jessop", status="pending", plan="none", program="prospect", phone="702-480-5054", email="zavendajessop863@gmail.com", photoshoot="scheduled", photoshoot_notes="May photoshoot list."),
    s("CK-01", "Sierra", "Swider", status="current", plan="pp", program="academy", phone="623-980-9935", email="", start="2026-08-26", notes="Checked in 08/26 for Modeling. Not yet on the 2026 enrollment workbook — added from the attendance tracker."),
]

students = academy + subscribers + prospects

# Deduplicate by id
seen = set()
unique = []
for st in students:
    if st["subscriptionStatus"] == "pending":
        st["subscriptionStatus"] = "interested"
    if st["id"] in seen:
        continue
    seen.add(st["id"])
    unique.append(st)
students = unique


def uid(prefix, n):
    return f"{prefix}-{n:04d}"


checkins = [
    ("1079", "2026-08-26T18:54:14", "modeling", ""),
    ("PS-23", "2026-08-26T19:02:23", "subscriber", ""),
    ("PS-10", "2026-08-26T19:03:35", "subscriber", ""),
    ("0516", "2026-08-26T19:11:07", "modeling", ""),
    ("CK-01", "2026-08-26T19:17:47", "modeling", ""),
    ("0930", "2026-08-26T19:23:03", "modeling", ""),
    ("0702", "2026-08-26T19:23:12", "modeling", ""),
    ("1076", "2026-08-26T19:24:18", "modeling", ""),
    ("0918", "2026-08-26T19:26:25", "acting", ""),
    ("1005", "2026-08-26T19:26:55", "modeling", ""),
    ("1091", "2026-08-26T19:27:41", "modeling", ""),
    ("0522", "2026-08-26T19:28:05", "acting", "Checked in as Tyler Thompson."),
    ("0926", "2026-08-26T19:28:36", "modeling", ""),
    ("0935", "2026-08-26T19:28:41", "subscriber", ""),
    ("0921", "2026-08-26T19:29:26", "modeling", ""),
    ("0916", "2026-08-26T19:27:58", "modeling", "Checked in as Gabby Anderson."),
    ("0583", "2026-08-26T19:31:04", "modeling", ""),
    ("0729", "2026-08-26T19:31:28", "modeling", ""),
    ("0501", "2026-08-26T19:32:02", "acting", "Checked in as Andrew Fordyce."),
    ("1077", "2026-08-26T19:41:54", "modeling", ""),
    ("0914", "2026-08-26T20:45:15", "modeling", ""),
    # Prior class nights
    ("0731", "2026-08-19T18:58:00", "modeling", "Strong runway walk tonight."),
    ("1090", "2026-08-19T19:04:00", "modeling", ""),
    ("0501", "2026-08-19T19:10:00", "acting", ""),
    ("0918", "2026-08-19T19:12:00", "acting", ""),
    ("1079", "2026-08-19T19:15:00", "modeling", ""),
    ("0516", "2026-08-19T19:18:00", "modeling", ""),
    ("0916", "2026-08-19T19:22:00", "modeling", ""),
    ("0522", "2026-08-12T19:05:00", "acting", ""),
    ("0501", "2026-08-12T19:08:00", "acting", ""),
    ("0918", "2026-08-12T19:09:00", "acting", ""),
    ("0729", "2026-08-12T19:20:00", "modeling", ""),
    ("1005", "2026-08-12T19:21:00", "modeling", ""),
    ("0583", "2026-08-12T19:24:00", "modeling", ""),
]

attendance = []
for i, (sid, when, ctype, note) in enumerate(checkins, start=1):
    attendance.append({
        "id": uid("att", i),
        "studentId": sid,
        "checkedInAt": when,
        "classType": ctype,
        "notes": note,
    })

feedback = [
    {"id": "fb-0001", "studentId": "1079", "createdAt": "2026-08-26T21:10:00", "author": "Staff", "classType": "modeling", "body": "First month — on time, took direction well on posture and eyeline. Keep working on a slower close."},
    {"id": "fb-0002", "studentId": "0918", "createdAt": "2026-08-26T21:15:00", "author": "Staff", "classType": "acting", "body": "Committed to the scene work. Voice is landing; next class push for stillness between lines."},
    {"id": "fb-0003", "studentId": "0501", "createdAt": "2026-08-26T21:18:00", "author": "Staff", "classType": "acting", "body": "Reliable presence in acting. Good partner work with Ivan."},
    {"id": "fb-0004", "studentId": "0916", "createdAt": "2026-08-26T21:20:00", "author": "Staff", "classType": "modeling", "body": "Interested in subscription. Strong commercial look — discuss portfolio refresh."},
    {"id": "fb-0005", "studentId": "0516", "createdAt": "2026-08-19T21:00:00", "author": "Staff", "classType": "modeling", "body": "Consistent attendance. Runway turns are cleaner than last month."},
    {"id": "fb-0006", "studentId": "PS-23", "createdAt": "2026-08-26T21:25:00", "author": "Staff", "classType": "subscriber", "body": "Came in as subscriber on 08/26. Confirm photoshoot slot and headshot usage."},
]


def payment_status_for(student):
    st = student["enrollmentStatus"]
    if st == "declined":
        return "declined"
    if st in ("overdue", "collections"):
        return "overdue"
    if st == "pending":
        return "due"
    if st == "paused":
        return "scheduled"
    if st == "pif":
        return "paid"
    return "due" if student.get("nextPaymentAmount") else "paid"


payments = []
n = 1
for st in students:
    amount = st.get("nextPaymentAmount")
    due = st.get("nextPaymentDate") or ""
    status = payment_status_for(st)
    method = "square"
    if st["id"] == "0931":
        method = "cash"
    if st["paymentPlan"] == "pif" and st["enrollmentStatus"] == "pif":
        payments.append({
            "id": uid("pay", n),
            "studentId": st["id"],
            "amount": 1850,
            "dueDate": st.get("startDate") or "2026-01-01",
            "paidDate": st.get("startDate") or "2026-01-01",
            "status": "paid",
            "method": "square",
            "squareInvoiceId": f"sqinv_{st['id']}_pif",
            "notes": "Paid in full — Square",
        })
        n += 1
        continue
    if not amount:
        if st["program"] == "subscriber" and st["enrollmentStatus"] in ("current", "overdue"):
            amount = 49
            due = due or "2026-09-01"
        elif st["program"] == "prospect":
            continue
        else:
            continue
    square_id = f"sqinv_{st['id']}_{due.replace('-', '') if due else 'open'}"
    rec = {
        "id": uid("pay", n),
        "studentId": st["id"],
        "amount": amount,
        "dueDate": due or "2026-09-01",
        "paidDate": due if status == "paid" else "",
        "status": status,
        "method": method,
        "squareInvoiceId": square_id,
        "notes": "Square invoice synced from enrollment workbook",
    }
    n += 1
    payments.append(rec)
    # Prior paid installment for current PP
    if st["paymentPlan"] == "pp" and st["enrollmentStatus"] == "current" and due:
        y, m, d = due.split("-")
        prev_m = int(m) - 1
        prev_y = int(y)
        if prev_m == 0:
            prev_m = 12
            prev_y -= 1
        prev = f"{prev_y:04d}-{prev_m:02d}-{d}"
        payments.append({
            "id": uid("pay", n),
            "studentId": st["id"],
            "amount": amount,
            "dueDate": prev,
            "paidDate": prev,
            "status": "paid",
            "method": "square",
            "squareInvoiceId": f"sqinv_{st['id']}_prev",
            "notes": "Prior Square payment",
        })
        n += 1

notifications = [
    {
        "id": "nt-0001",
        "studentIds": ["0924", "0579"],
        "channel": "sms",
        "subject": "",
        "body": "Hi from Viya Academy — your Square payment was declined. Please update your card or reply here and we can help.",
        "sentAt": "2026-08-26T12:00:00",
        "status": "demo",
    },
    {
        "id": "nt-0002",
        "studentIds": ["0202", "0206", "0749", "0938"],
        "channel": "email",
        "subject": "Viya Academy — payment reminder",
        "body": "Hello from Viya Academy. Our records show a past-due balance. Please complete your Square invoice or contact the front desk at (602) 342-2902.",
        "sentAt": "2026-08-26T12:05:00",
        "status": "demo",
    },
]

OUT.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "students": students,
    "attendance": attendance,
    "feedback": feedback,
    "payments": payments,
    "notifications": notifications,
}
OUT.write_text(json.dumps(payload, indent=2))
print(f"Wrote {len(students)} students, {len(attendance)} check-ins, {len(payments)} payments -> {OUT}")
