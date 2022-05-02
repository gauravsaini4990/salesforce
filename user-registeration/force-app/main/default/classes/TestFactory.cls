@isTes
public class TestFactory {
    
    public static Account createAccount(Boolean doInsert){
        //Create Account
        Account testAccount = new Account(Name = 'Test test', ShippingCity = 'San Francisco');
		if(doInsert) insert testAccount;
        
        return testAccount;
    }
    
    public static Contact createContact(Account acc ,Boolean doInsert) {
        Contact testContact = new Contact(
            FirstName = 'John',
            LastName = 'Doe',
            accountId = acc.Id
        );
        
        if(doInsert) insert testContact;
        
        return testContact;
    }
    
    public static Opportunity createOpportunity(Account acc, Contact con, Boolean doInsert) {
        //Create Opportunity
        Opportunity testOpportunity = new Opportunity(Name = 'Test test', AccountId = acc.Id, CloseDate = System.today(),
                                                      StageName = 'Project Awarded', Amount = 500000,
                                                      Type = 'Turnkey System',
                                                      RecordTypeId = Schema.SObjectType.Opportunity.getRecordTypeInfosByName().get('Standard Opportunity').getRecordTypeId());
        if(doInsert) insert testOpportunity;
        
        return testOpportunity;
    } 
    
}