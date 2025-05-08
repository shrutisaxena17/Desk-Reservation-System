import { LightningElement, track } from 'lwc';
import getLocations from '@salesforce/apex/DeskSelectionController.getLocations';
import getOffices from '@salesforce/apex/DeskSelectionController.getOffices';
import getFloors from '@salesforce/apex/DeskSelectionController.getFloors';
import getDesks from '@salesforce/apex/DeskSelectionController.getDesks';
import createDeskReservation from '@salesforce/apex/DeskSelectionController.createDeskReservation';
import getReservationForDesk from '@salesforce/apex/DeskSelectionController.getReservationForDesk';
import cancelReservation from '@salesforce/apex/DeskSelectionController.cancelReservation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';

export default class DeskSelectionFlow extends LightningElement {
    locationOptions = [];
    officeOptions = [];
    floorOptions = [];
    deskList = [];

    selectedLocation;
    selectedOffice;
    selectedFloor;

    showModal = false;
    selectedDeskId;
    selectedDeskNumber;
    reservationName = '';
    reservationDate = '';
    @track reservationInfo;
    @track showReservationTab = false;

    userId = USER_ID;
    canCancel = false;

    connectedCallback() {
        this.loadLocations();
    }


    loadLocations() {
        getLocations()
            .then(data => {
                this.locationOptions = data.map(loc => ({
                    label: loc.Name,
                    value: loc.Id
                }));
            })
            .catch(this.handleError('Error fetching locations'));
    }

    handleLocationChange(event) {
        this.selectedLocation = event.detail.value;
        this.resetOfficeAndBelow();
        getOffices({ locationId: this.selectedLocation })
            .then(data => {
                this.officeOptions = data.map(office => ({
                    label: office.Name,
                    value: office.Id
                }));
            })
            .catch(this.handleError('Error fetching offices'));
    }

    handleOfficeChange(event) {
        this.selectedOffice = event.detail.value;
        this.resetFloorAndDesks();
        getFloors({ officeId: this.selectedOffice })
            .then(data => {
                this.floorOptions = data.map(floor => ({
                    label: floor.Name,
                    value: floor.Id
                }));
            })
            .catch(this.handleError('Error fetching floors'));
    }

    handleFloorChange(event) {
        this.selectedFloor = event.detail.value;
        this.showReservationTab = false;
        this.loadDesks();
    }

    loadDesks() {
        getDesks({ floorId: this.selectedFloor })
            .then(data => {
                this.deskList = data.map(desk => {
                    const reservations = desk.Desk_Reservations__r || [];
                    const latestStatus = reservations.length ? reservations[0].Status__c : desk.Status__c;
                    return {
                        ...desk,
                        deskCssClass: `desk-box ${this.getDeskStatusClass(desk, reservations)}`,
                        title: `Desk ${desk.Desk_Number__c} - ${latestStatus || 'Unknown'}`
                    };
                });
            })
            .catch(this.handleError('Error fetching desks'));
    }


    getDeskStatusClass(desk, reservations = []) {
        const reservationStatus = reservations.length ? reservations[0].Status__c : null;

        if (desk.Status__c === 'Under Maintenance' || desk.Status__c === 'Unavailable') {
            return 'maintenance';
        }
        if (['Booked', 'Checked-In'].includes(reservationStatus)) {
            return 'booked';
        }
        return 'available';
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }


    handleDeskClick(event) {
        const deskId = event.currentTarget.dataset.deskId;
        const desk = this.deskList.find(d => d.Id === deskId);
        if (!desk) return;

        this.selectedDeskId = desk.Id;
        this.selectedDeskNumber = desk.Desk_Number__c;

        const reservations = desk.Desk_Reservations__r || [];
        const isBooked = reservations.length && ['Booked', 'Checked-In'].includes(reservations[0].Status__c);

        if (['Under Maintenance', 'Unavailable'].includes(desk.Status__c)) {
            return;
        }

        if (isBooked) {
            this.fetchReservation(deskId);
        } else {
            this.prepareNewReservation();
        }
    }

    fetchReservation(deskId) {
        getReservationForDesk({ deskId })
            .then(result => {
                this.reservationInfo = {
                    Id: result.Id,
                    DeskName: result.Name || 'N/A',
                    UserName: result.User__r?.Name || 'N/A',
                    ReservationDate: result.Reservation_Date__c || 'N/A',
                    Status: result.Status__c || 'N/A',
                    UserId: result.User__r?.Id,
                    CreatedById: result.CreatedById
                };
                this.canCancel = [result.User__r?.Id, result.CreatedById].includes(this.userId);
                this.showReservationTab = true;
            })
            .catch(this.handleError('Error fetching reservation info'));
    }

    prepareNewReservation() {
        this.reservationDate = this.getTodayDate();
        this.reservationName = '';
        this.showModal = true;
    }


    handleReservationName(event) {
        this.reservationName = event.detail.value;
    }

    handleReservationDate(event) {
        this.reservationDate = event.detail.value;
    }

    closeModal() {
        this.showModal = false;
    }

    submitReservation() {
        if (!this.reservationName || !this.reservationDate) {
            this.showToast('Error', 'Please fill in all fields.', 'error');
            return;
        }

        createDeskReservation({
            deskId: this.selectedDeskId,
            reservationDate: this.reservationDate,
            reservationName: this.reservationName
        })
            .then(() => {
                this.showToast('Success', 'Desk booked successfully', 'success');
                this.closeModal();
                this.loadDesks();
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Error occurred', 'error');
            });
    }

    handleCancelReservation() {
        cancelReservation({ reservationId: this.reservationInfo.Id })
            .then(() => {
                this.showToast('Success', 'Reservation cancelled', 'success');
                this.showReservationTab = false;
                this.reservationInfo = null;
                this.loadDesks();
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Failed to cancel reservation', 'error');
            });
    }


    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleError(contextMessage) {
        return (error) => {
            console.error(`${contextMessage}:`, error);
            this.showToast('Error', contextMessage, 'error');
        };
    }

    resetOfficeAndBelow() {
        this.selectedOffice = null;
        this.selectedFloor = null;
        this.officeOptions = [];
        this.floorOptions = [];
        this.deskList = [];
    }

    resetFloorAndDesks() {
        this.selectedFloor = null;
        this.floorOptions = [];
        this.deskList = [];
    }
}
