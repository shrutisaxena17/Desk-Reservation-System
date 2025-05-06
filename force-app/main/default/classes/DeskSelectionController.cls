public with sharing class DeskSelectionController {
    
    @AuraEnabled(cacheable=true)
    public static List<Office_Location__c> getLocations() {
        return [SELECT Id, Name FROM Office_Location__c WHERE isActive__c = true ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Office__c> getOffices(Id locationId) {
        return [SELECT Id, Name FROM Office__c WHERE Office_Location__c = :locationId AND isActive__c = true ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Floor__c> getFloors(Id officeId) {
        return [SELECT Id, Name FROM Floor__c WHERE Floors__c = :officeId AND isActive__c = true ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Desk__c> getDesks(Id floorId) {
        return [SELECT Id, Name, Desk_Number__c, Status__c, Notes__c FROM Desk__c WHERE Desks__c = :floorId AND isActive__c = true ORDER BY Name];
    }
}