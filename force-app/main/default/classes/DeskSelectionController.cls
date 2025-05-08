public with sharing class DeskSelectionController {

    @AuraEnabled(cacheable=true)
    public static List<Office_Location__c> getLocations() {
        return [SELECT Id, Name FROM Office_Location__c WHERE isActive__c = true ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Office__c> getOffices(Id locationId) {
        return [
            SELECT Id, Name FROM Office__c 
            WHERE Office_Location__c = :locationId AND isActive__c = true 
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Floor__c> getFloors(Id officeId) {
        return [
            SELECT Id, Name FROM Floor__c 
            WHERE Floors__c = :officeId AND isActive__c = true 
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Desk__c> getDesks(Id floorId) {
        return [
            SELECT Id, Name, Desk_Number__c, Status__c, Notes__c,
                (SELECT Id, Status__c, CreatedDate FROM Desk_Reservations__r ORDER BY CreatedDate DESC LIMIT 1)
            FROM Desk__c
            WHERE Desks__c = :floorId AND isActive__c = true
            ORDER BY Name
        ];
    }

    @AuraEnabled
    public static void createDeskReservation(String deskId, Date reservationDate, String reservationName) {
        if (String.isBlank(deskId) || reservationDate == null || String.isBlank(reservationName)) {
            throw new AuraHandledException('Invalid input data.');
        }

        List<Desk_Reservation__c> existing = [
            SELECT Id FROM Desk_Reservation__c 
            WHERE Desk__c = :deskId AND Reservation_Date__c = :reservationDate 
            AND Status__c = 'Booked'
        ];

        if (!existing.isEmpty()) {
            throw new AuraHandledException('Desk is already booked for this date.');
        }

        insert new Desk_Reservation__c(
            Name = reservationName,
            Desk__c = deskId,
            Reservation_Date__c = reservationDate,
            User__c = UserInfo.getUserId(),
            Status__c = 'Booked'
        );
    }

    @AuraEnabled(cacheable=true)
    public static Desk_Reservation__c getReservationForDesk(Id deskId) {
        if (deskId == null) {
            throw new AuraHandledException('Desk ID is required.');
        }

        List<Desk_Reservation__c> reservations = [
            SELECT Id, Name, Reservation_Date__c, Status__c, Desk__r.Name, User__r.Id, User__r.Name, CreatedById
            FROM Desk_Reservation__c
            WHERE Desk__c = :deskId
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        if (reservations.isEmpty()) {
            throw new AuraHandledException('No reservation found for this desk.');
        }

        return reservations[0];
    }

    @AuraEnabled
    public static void cancelReservation(Id reservationId) {
        if (reservationId == null) {
            throw new AuraHandledException('Reservation ID is required.');
        }

        Desk_Reservation__c res = [
            SELECT Id, Status__c, Desk__c 
            FROM Desk_Reservation__c 
            WHERE Id = :reservationId
            LIMIT 1
        ];

        res.Status__c = 'Cancelled';
        update res;

        Desk__c desk = [
            SELECT Id, Status__c 
            FROM Desk__c 
            WHERE Id = :res.Desk__c
            LIMIT 1
        ];

        desk.Status__c = 'Available';
        update desk;
    }
}
