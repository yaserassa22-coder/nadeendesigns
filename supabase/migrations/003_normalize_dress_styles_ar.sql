-- Normalize legacy style values to Arabic options
UPDATE dresses SET style = 'ملكي' WHERE style IN ('Classic Luxury', 'royal', 'Royal');
UPDATE dresses SET style = 'كلاسيكي' WHERE style IN ('classic', 'Classic', 'vintage', 'Vintage', 'فintage');
UPDATE dresses SET style = 'عصري' WHERE style IN ('modern', 'Modern', 'حديث');
UPDATE dresses SET style = 'فاخر' WHERE style IN ('luxury', 'Luxury');
UPDATE dresses SET style = 'ناعم' WHERE style IN ('soft', 'Soft');
UPDATE dresses SET style = 'بسيط' WHERE style IN ('simple', 'Simple');
UPDATE dresses SET style = 'أميري' WHERE style IN ('أميرة', 'princess', 'Princess');
UPDATE dresses SET style = 'حورية البحر' WHERE style IN ('mermaid', 'Mermaid', 'مermaid');
UPDATE dresses SET style = 'قصة A (قصة حرف A)' WHERE style IN ('A-Line', 'A Line', 'a-line');
UPDATE dresses SET style = 'منفوش' WHERE style IN ('ballgown', 'Ballgown');
UPDATE dresses SET style = 'مستقيم' WHERE style IN ('sheath', 'Sheath');
UPDATE dresses SET style = 'بوهيمي' WHERE style IN ('بوهو', 'boho', 'Boho', 'Bohemian');
UPDATE dresses SET style = 'دانتيل فاخر' WHERE style IN ('lace', 'Lace');
UPDATE dresses SET style = 'ساتان فاخر' WHERE style IN ('satin', 'Satin');
UPDATE dresses SET style = 'تول فاخر' WHERE style IN ('tulle', 'Tulle');
UPDATE dresses SET style = 'تصميم مخصص' WHERE style IN ('custom', 'Custom');
