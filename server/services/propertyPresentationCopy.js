// All deterministic sale/payment copy is localized; descriptive copy comes from OpenRouter.
const rows = {
  ru: [
    'Презентация объекта', 'Характеристики и преимущества', 'Удобства для жизни', 'Локация и окружение', 'Пространства объекта', 'Формат продажи', 'Как проходит оплата', 'Следующий шаг',
    'Аукцион', 'Купить сейчас', 'Покупка долей', 'Объект с долгами', 'Продажа по объявлению',
    'Цена объявления', 'Стартовая цена', 'Окончание торгов', 'Всего долей', 'Продано долей', 'Заявленная задолженность', 'Резерв', 'Остаток',
    'Условия уточняются у продавца', 'Указано в объявлении', 'Приблизительное положение района. Точный адрес уточните у продавца. Выделение не обозначает границы участка.',
    'Положение по данным объявления; выделение не обозначает границы участка.', 'Карта временно недоступна', 'Локация не указана', 'Расстояния по прямой от точки на карте, не маршруты. Данные OpenStreetMap.',
    'Предварительная проверка', 'Подписание и резерв', 'Завершение расчётов',
    'Перед участием нужен депозит от 3 000 €. Итоговая стоимость определяется результатом торгов. Условия резерва проверьте при оформлении.',
    'При доступном онлайн-оформлении резерв составляет 10% цены покупки. Остаток оплачивается по договору; налоги и дополнительные расходы уточняются отдельно.',
    'Сумма зависит от количества долей и доступного остатка. Договор определяет права, расходы и порядок использования. Не применяется схема оплаты целого объекта.',
    'Размер и порядок погашения долга, снятие обременений и получатели платежей должны быть согласованы в договоре. Задолженность не считается погашенной автоматически.',
    'Онлайн-покупка для этого объявления не включена. Сумму аванса, сроки и способ окончательного расчёта согласуйте с продавцом.',
    'Проверьте документы, актуальную доступность и состояние объекта.', 'Подпишите условия сделки и подтвердите сумму резерва перед оплатой.', 'Оплатите остаток и оформите передачу прав в порядке, установленном договором.',
    'Материал основан на объявлении и данных карты. Условия и доступность проверяются перед сделкой.', 'Описание подготовлено по данным объявления: AI-генерация временно недоступна.', 'Данные об удобствах требуют уточнения', 'Обзор района', 'Ближайшее окружение', 'Рядом с объектом', 'Запросите просмотр и актуальные условия сделки',
  ],
  en: [
    'Property presentation', 'Features and their benefits', 'Everyday amenities', 'Location and surroundings', 'Property spaces', 'Sale format', 'How payment works', 'Next step',
    'Auction', 'Buy now', 'Shared ownership', 'Property with debts', 'Sale by listing', 'Listing price', 'Starting price', 'Auction closes', 'Total shares', 'Shares sold', 'Reported debt', 'Reservation', 'Balance',
    'Confirm terms with the seller', 'As listed', 'Approximate area location. Confirm the exact address with the seller. Highlight does not represent parcel boundaries.',
    'Location from listing data; highlight does not represent parcel boundaries.', 'Map temporarily unavailable', 'Location not provided', 'Straight-line distances from the map point, not routes. OpenStreetMap data.',
    'Initial checks', 'Agreement and reservation', 'Final settlement',
    'Auction participation requires a deposit of at least €3,000. The final price follows the auction result. Confirm reservation terms at checkout.',
    'When online checkout is enabled, reservation is 10% of the purchase price. The balance is paid under the contract; confirm taxes and other costs separately.',
    'Payment depends on the number of shares and remaining availability. The agreement defines rights, costs and use. Whole-property payment terms do not apply.',
    'Agree debt repayment, removal of encumbrances and payment recipients in the contract. Debt is not automatically discharged.',
    'Online purchase is not enabled for this listing. Agree the advance amount, deadlines and final payment method with the seller.',
    'Check documents, current availability and property condition.', 'Sign the transaction terms and confirm the reservation amount before payment.', 'Pay the balance and transfer rights under the agreed contract.',
    'Based on listing and map data. Verify terms and availability before transacting.', 'Prepared from listing data: AI generation is temporarily unavailable.', 'Confirm available amenities', 'Area overview', 'Local surroundings', 'Nearby places', 'Request a viewing and current sale terms',
  ],
  de: [
    'Objektpräsentation', 'Merkmale und Vorteile', 'Ausstattung im Alltag', 'Lage und Umgebung', 'Räume des Objekts', 'Verkaufsform', 'Zahlungsablauf', 'Nächster Schritt',
    'Auktion', 'Sofort kaufen', 'Miteigentumsanteile', 'Objekt mit Schulden', 'Verkauf laut Inserat', 'Angebotspreis', 'Startpreis', 'Auktionsende', 'Anteile insgesamt', 'Verkaufte Anteile', 'Angegebene Schulden', 'Reservierung', 'Restbetrag',
    'Bedingungen mit dem Verkäufer klären', 'Laut Inserat', 'Ungefähre Lage des Gebiets. Genaue Adresse beim Verkäufer erfragen. Markierung zeigt keine Grundstücksgrenzen.',
    'Lage laut Inserat; Markierung zeigt keine Grundstücksgrenzen.', 'Karte vorübergehend nicht verfügbar', 'Lage nicht angegeben', 'Luftlinienentfernungen vom Kartenpunkt, keine Routen. OpenStreetMap-Daten.',
    'Vorprüfung', 'Vertrag und Reservierung', 'Abschlusszahlung',
    'Die Auktion erfordert eine Kaution von mindestens 3.000 €. Der Endpreis folgt dem Auktionsergebnis. Reservierungsbedingungen beim Abschluss prüfen.',
    'Bei aktivierter Online-Abwicklung beträgt die Reservierung 10% des Kaufpreises. Restzahlung laut Vertrag; Steuern und Nebenkosten separat klären.',
    'Die Zahlung hängt von Anzahl und Verfügbarkeit der Anteile ab. Rechte, Kosten und Nutzung regelt der Vertrag. Zahlungsbedingungen für ein ganzes Objekt gelten nicht.',
    'Schuldentilgung, Löschung von Belastungen und Zahlungsempfänger vertraglich vereinbaren. Schulden werden nicht automatisch getilgt.',
    'Online-Kauf ist für dieses Inserat nicht aktiviert. Anzahlung, Fristen und abschließende Zahlungsweise mit dem Verkäufer vereinbaren.',
    'Unterlagen, aktuelle Verfügbarkeit und Zustand prüfen.', 'Vertragsbedingungen unterzeichnen und Reservierungsbetrag vor Zahlung bestätigen.', 'Restbetrag zahlen und Rechte gemäß Vertrag übertragen.',
    'Basiert auf Inserat und Kartendaten. Bedingungen und Verfügbarkeit vor Abschluss prüfen.', 'Aus Inseratsdaten erstellt: KI-Generierung ist vorübergehend nicht verfügbar.', 'Ausstattung bestätigen lassen', 'Gebietsübersicht', 'Direkte Umgebung', 'Orte in der Nähe', 'Besichtigung und aktuelle Bedingungen anfragen',
  ],
  es: [
    'Presentación del inmueble', 'Características y ventajas', 'Servicios para vivir', 'Ubicación y entorno', 'Espacios del inmueble', 'Modalidad de venta', 'Cómo se realiza el pago', 'Siguiente paso',
    'Subasta', 'Comprar ahora', 'Compra de participaciones', 'Inmueble con deudas', 'Venta según anuncio', 'Precio anunciado', 'Precio inicial', 'Fin de subasta', 'Participaciones totales', 'Participaciones vendidas', 'Deuda declarada', 'Reserva', 'Saldo',
    'Confirmar condiciones con el vendedor', 'Según el anuncio', 'Ubicación aproximada de la zona. Confirme la dirección exacta con el vendedor. La marca no representa los límites de la parcela.',
    'Ubicación según el anuncio; la marca no representa los límites de la parcela.', 'Mapa temporalmente no disponible', 'Ubicación no indicada', 'Distancias en línea recta desde el punto del mapa, no rutas. Datos de OpenStreetMap.',
    'Comprobaciones iniciales', 'Contrato y reserva', 'Liquidación final',
    'Participar en la subasta requiere un depósito mínimo de 3.000 €. El precio final depende del resultado. Confirme las condiciones de reserva al formalizar.',
    'Con compra en línea habilitada, la reserva es del 10% del precio. El saldo se paga según contrato; confirme impuestos y gastos por separado.',
    'El pago depende del número de participaciones disponibles. El contrato define derechos, gastos y uso. No se aplican las condiciones de pago del inmueble completo.',
    'Acuerde en contrato el pago de deudas, la cancelación de cargas y los destinatarios. La deuda no se cancela automáticamente.',
    'La compra en línea no está habilitada. Acuerde con el vendedor el anticipo, los plazos y el método de pago final.',
    'Revise documentos, disponibilidad actual y estado del inmueble.', 'Firme las condiciones y confirme el importe de reserva antes de pagar.', 'Pague el saldo y transfiera los derechos según el contrato.',
    'Basado en el anuncio y el mapa. Verifique condiciones y disponibilidad antes de comprar.', 'Preparado con datos del anuncio: la generación por IA no está disponible temporalmente.', 'Confirme los servicios disponibles', 'Vista de la zona', 'Entorno cercano', 'Lugares cercanos', 'Solicite una visita y las condiciones actuales',
  ],
  fr: [
    'Présentation du bien', 'Caractéristiques et avantages', 'Équipements au quotidien', 'Localisation et environs', 'Espaces du bien', 'Modalité de vente', 'Déroulement du paiement', 'Prochaine étape',
    'Enchères', 'Acheter maintenant', 'Achat de parts', 'Bien avec dettes', 'Vente selon annonce', 'Prix annoncé', 'Prix de départ', 'Fin des enchères', 'Total des parts', 'Parts vendues', 'Dette déclarée', 'Réservation', 'Solde',
    'Confirmer les conditions avec le vendeur', 'Selon annonce', 'Localisation approximative du quartier. Confirmez l’adresse exacte avec le vendeur. La zone ne représente pas les limites de la parcelle.',
    'Localisation selon annonce ; la zone ne représente pas les limites de la parcelle.', 'Carte temporairement indisponible', 'Localisation non indiquée', 'Distances à vol d’oiseau depuis le point de la carte, pas des itinéraires. Données OpenStreetMap.',
    'Vérifications initiales', 'Contrat et réservation', 'Règlement final',
    'Les enchères nécessitent un dépôt d’au moins 3 000 €. Le prix final dépend du résultat. Confirmez les modalités de réservation lors de la transaction.',
    'Si l’achat en ligne est activé, la réservation représente 10% du prix. Le solde est payé selon le contrat ; taxes et frais à confirmer séparément.',
    'Le paiement dépend du nombre de parts disponibles. Le contrat définit droits, frais et usage. Les modalités du bien entier ne s’appliquent pas.',
    'Convenez du remboursement des dettes, de la levée des charges et des bénéficiaires dans le contrat. La dette n’est pas automatiquement acquittée.',
    'L’achat en ligne n’est pas activé. Convenez de l’acompte, des délais et du paiement final avec le vendeur.',
    'Vérifiez les documents, la disponibilité et l’état du bien.', 'Signez les conditions et confirmez le montant de réservation avant paiement.', 'Payez le solde et transférez les droits selon le contrat.',
    'Fondé sur l’annonce et la carte. Vérifiez les conditions et la disponibilité avant transaction.', 'Préparé à partir de l’annonce : génération IA temporairement indisponible.', 'Équipements à confirmer', 'Vue du quartier', 'Environnement proche', 'Lieux à proximité', 'Demandez une visite et les conditions actuelles',
  ],
  pl: [
    'Prezentacja nieruchomości', 'Parametry i korzyści', 'Udogodnienia na co dzień', 'Lokalizacja i otoczenie', 'Przestrzenie nieruchomości', 'Forma sprzedaży', 'Jak przebiega płatność', 'Następny krok',
    'Aukcja', 'Kup teraz', 'Zakup udziałów', 'Nieruchomość z długami', 'Sprzedaż według ogłoszenia', 'Cena ofertowa', 'Cena wywoławcza', 'Koniec aukcji', 'Wszystkie udziały', 'Sprzedane udziały', 'Zgłoszone zadłużenie', 'Rezerwacja', 'Pozostała kwota',
    'Uzgodnij warunki ze sprzedawcą', 'Według ogłoszenia', 'Przybliżone położenie okolicy. Dokładny adres potwierdź u sprzedawcy. Zaznaczenie nie oznacza granic działki.',
    'Lokalizacja według ogłoszenia; zaznaczenie nie oznacza granic działki.', 'Mapa chwilowo niedostępna', 'Brak lokalizacji', 'Odległości w linii prostej od punktu mapy, nie trasy. Dane OpenStreetMap.',
    'Wstępna weryfikacja', 'Umowa i rezerwacja', 'Rozliczenie końcowe',
    'Udział w aukcji wymaga depozytu co najmniej 3 000 €. Cena końcowa wynika z aukcji. Warunki rezerwacji potwierdź przy zakupie.',
    'Przy aktywnym zakupie online rezerwacja wynosi 10% ceny. Reszta płatna według umowy; podatki i koszty dodatkowe ustal osobno.',
    'Kwota zależy od liczby dostępnych udziałów. Umowa określa prawa, koszty i użytkowanie. Zasady zapłaty za całość nieruchomości nie obowiązują.',
    'Spłatę długu, wykreślenie obciążeń i odbiorców płatności określ w umowie. Dług nie jest spłacany automatycznie.',
    'Zakup online nie jest aktywny. Uzgodnij zaliczkę, terminy i sposób płatności końcowej ze sprzedawcą.',
    'Sprawdź dokumenty, dostępność i stan nieruchomości.', 'Podpisz warunki i potwierdź kwotę rezerwacji przed płatnością.', 'Zapłać resztę i przenieś prawa zgodnie z umową.',
    'Na podstawie ogłoszenia i mapy. Zweryfikuj warunki i dostępność przed transakcją.', 'Opracowano z ogłoszenia: generowanie AI jest chwilowo niedostępne.', 'Potwierdź dostępne udogodnienia', 'Widok okolicy', 'Bliskie otoczenie', 'Miejsca w pobliżu', 'Umów oglądanie i sprawdź aktualne warunki',
  ],
  sv: [
    'Objektpresentation', 'Egenskaper och fördelar', 'Bekvämligheter i vardagen', 'Läge och omgivning', 'Objektets utrymmen', 'Försäljningsform', 'Så fungerar betalningen', 'Nästa steg',
    'Auktion', 'Köp nu', 'Köp av andelar', 'Objekt med skulder', 'Försäljning enligt annons', 'Annonspris', 'Utgångspris', 'Auktionen avslutas', 'Totalt antal andelar', 'Sålda andelar', 'Angiven skuld', 'Reservation', 'Återstående belopp',
    'Bekräfta villkor med säljaren', 'Enligt annonsen', 'Ungefärligt områdesläge. Bekräfta exakt adress med säljaren. Markeringen visar inte fastighetsgränser.',
    'Läge enligt annonsen; markeringen visar inte fastighetsgränser.', 'Kartan är tillfälligt otillgänglig', 'Läge saknas', 'Fågelvägsavstånd från kartpunkten, inte rutter. OpenStreetMap-data.',
    'Inledande kontroll', 'Avtal och reservation', 'Slutbetalning',
    'Auktionsdeltagande kräver en deposition på minst 3 000 €. Slutpriset avgörs av auktionen. Bekräfta reservationsvillkor vid köpet.',
    'När onlineköp är aktiverat är reservationen 10% av priset. Resterande belopp betalas enligt avtalet; skatter och avgifter bekräftas separat.',
    'Betalningen beror på antal tillgängliga andelar. Avtalet anger rättigheter, kostnader och användning. Betalningsvillkor för hela objektet gäller inte.',
    'Avtala om skuldreglering, avförande av belastningar och betalningsmottagare. Skulden regleras inte automatiskt.',
    'Onlineköp är inte aktiverat. Kom överens om förskott, tidsfrister och slutbetalning med säljaren.',
    'Kontrollera handlingar, aktuell tillgänglighet och skick.', 'Underteckna villkor och bekräfta reservationsbelopp före betalning.', 'Betala återstående belopp och överför rättigheter enligt avtalet.',
    'Baserat på annons och karta. Kontrollera villkor och tillgänglighet före affär.', 'Framtaget från annonsen: AI-generering är tillfälligt otillgänglig.', 'Bekräfta tillgängliga bekvämligheter', 'Områdesöversikt', 'Närområde', 'Platser i närheten', 'Boka visning och begär aktuella villkor',
  ],
}
const keys = ['cover', 'features', 'amenities', 'location', 'gallery', 'sale', 'payment', 'next', 'auction', 'fixed', 'share', 'debt', 'listing', 'price', 'start', 'end', 'totalShares', 'soldShares', 'debtAmount', 'reserve', 'balance', 'confirm', 'asListed', 'approximateLocation', 'listingLocation', 'mapUnavailable', 'locationMissing', 'distanceNote', 'check', 'sign', 'settle', 'auctionPayment', 'fixedPayment', 'sharePayment', 'debtPayment', 'listingPayment', 'checkBody', 'signBody', 'settleBody', 'disclaimer', 'fallback', 'amenitiesMissing', 'areaMap', 'localMap', 'nearby', 'cta']
export const PRESENTATION_LANGUAGES = Object.keys(rows)
export function presentationCopy(language = 'en') {
  const values = rows[language] || rows.en
  if (values.length !== keys.length) throw new Error('Invalid presentation translations')
  return Object.fromEntries(keys.map((key, i) => [key, values[i]]))
}

const facts = {
  ru: ['Площадь', 'Спальни', 'Ванные', 'Комнаты', 'Участок', 'Пространство для разных повседневных сценариев', 'Отдельное пространство для семьи и гостей', 'Проще организовать утренние сборы', 'Возможность разделить занятия и отдых', 'Место для занятий на открытом воздухе'],
  en: ['Area', 'Bedrooms', 'Bathrooms', 'Rooms', 'Plot', 'Space for different everyday needs', 'Separate space for family and guests', 'Easier morning routines', 'Separate activities and relaxation', 'Space for outdoor activities'],
  de: ['Fläche', 'Schlafzimmer', 'Badezimmer', 'Zimmer', 'Grundstück', 'Platz für unterschiedliche Alltagsbedürfnisse', 'Eigener Raum für Familie und Gäste', 'Einfachere Morgenroutine', 'Aktivitäten und Erholung trennen', 'Platz für Aktivitäten im Freien'],
  es: ['Superficie', 'Dormitorios', 'Baños', 'Habitaciones', 'Parcela', 'Espacio para distintas necesidades cotidianas', 'Espacio separado para familia e invitados', 'Facilita las rutinas de la mañana', 'Separar actividades y descanso', 'Espacio para actividades al aire libre'],
  fr: ['Surface', 'Chambres', 'Salles de bains', 'Pièces', 'Terrain', 'De la place pour les besoins du quotidien', 'Un espace séparé pour famille et invités', 'Des matinées plus faciles à organiser', 'Séparer activités et détente', 'De la place pour les activités en plein air'],
  pl: ['Powierzchnia', 'Sypialnie', 'Łazienki', 'Pokoje', 'Działka', 'Przestrzeń na różne codzienne potrzeby', 'Osobna przestrzeń dla rodziny i gości', 'Łatwiejsza organizacja poranków', 'Oddzielne miejsce na zajęcia i odpoczynek', 'Miejsce na aktywności na zewnątrz'],
  sv: ['Yta', 'Sovrum', 'Badrum', 'Rum', 'Tomt', 'Plats för olika vardagsbehov', 'Separata utrymmen för familj och gäster', 'Enklare morgonrutiner', 'Skilj aktiviteter från vila', 'Plats för utomhusaktiviteter'],
}
export function presentationFactCopy(language) {
  return facts[language] || facts.en
}

const nearbyBenefits = {
  ru: ['Для повседневных покупок', 'Для поездок по району', 'Медицинские услуги в районе', 'Для отдыха и активного досуга', 'Образование в районе'],
  en: ['Everyday shopping', 'Transport around the area', 'Local medical services', 'Leisure and active recreation', 'Local education'],
  de: ['Einkäufe im Alltag', 'Verkehr im Viertel', 'Medizinische Versorgung vor Ort', 'Freizeit und aktive Erholung', 'Bildung im Viertel'],
  es: ['Compras cotidianas', 'Transporte por la zona', 'Servicios médicos locales', 'Ocio y actividades', 'Educación en la zona'],
  fr: ['Courses du quotidien', 'Transports du quartier', 'Services médicaux locaux', 'Loisirs et activités', 'Éducation dans le quartier'],
  pl: ['Codzienne zakupy', 'Dojazdy po okolicy', 'Lokalne usługi medyczne', 'Wypoczynek i aktywności', 'Edukacja w okolicy'],
  sv: ['Vardagsinköp', 'Resor i området', 'Lokala vårdtjänster', 'Fritid och aktiviteter', 'Utbildning i området'],
}
export function presentationNearbyBenefit(category, language) {
  const index = ['shops', 'transport', 'medical', 'recreation', 'schools'].indexOf(category)
  return (nearbyBenefits[language] || nearbyBenefits.en)[Math.max(0, index)]
}
