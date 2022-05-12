public with sharing class DataSelector {
    public DataSelector() {

    }

    public static List<Account> getAccounts(){
        List<Account> accountList = [select id from account WITH SECURITY_ENFORCED];
        return accountList;
    }
    
    public static List<Contact> getContacts(){
        List<Contact> contactList = [select id from Contact WITH SECURITY_ENFORCED];
        return contactList;
    }
    
    public static List<Opportunity> getOpportunities(){
        List<Opportunity> opportunityList = [select id from Opportunity WITH SECURITY_ENFORCED];
        return opportunityList;
    }
}