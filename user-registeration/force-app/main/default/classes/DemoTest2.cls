@isTest
public with sharing class DemoTest2 {
    @TestSetup
    static void makeData(){
        Account testAccount = TestFactory.createAccount(true);
        Contact testContact= TestFactory.createContact(testAccount,true);
        TestFactory.createOpportunity(testAccount,testContact,true);
    }

    @isTest
    static void getAccountsTest(){
        System.assertEquals(1,DataSelector.getAccounts().size(),'Account should be returned');
    }

    @isTest
    static void getContactsTest(){
        System.assertEquals(1,DataSelector.getContacts().size(),'Contact should be returned');
    }

    @isTest
    static void getOpportunityTest(){
        System.assertEquals(1,DataSelector.getOpportunities().size(),'Opportunity should be returned');
    }
}