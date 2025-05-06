import { LightningElement, track } from 'lwc';
import getLocations from '@salesforce/apex/DeskSelectionController.getLocations';
import getOffices from '@salesforce/apex/DeskSelectionController.getOffices';
import getFloors from '@salesforce/apex/DeskSelectionController.getFloors';
import getDesks from '@salesforce/apex/DeskSelectionController.getDesks';

export default class DeskSelectionFlow extends LightningElement {
     locationOptions = [];
     officeOptions = [];
     floorOptions = [];
     deskList = [];

    selectedLocation;
    selectedOffice;
    selectedFloor;

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
            .catch(error => {
                console.error('Error fetching locations', error);
            });
    }

    handleLocationChange(event) {
        this.selectedLocation = event.detail.value;
        this.selectedOffice = null;
        this.selectedFloor = null;
        this.floorOptions = [];
        this.deskList = [];
        getOffices({ locationId: this.selectedLocation })
            .then(data => {
                this.officeOptions = data.map(office => ({
                    label: office.Name,
                    value: office.Id
                }));
            })
            .catch(error => {
                console.error('Error fetching offices', error);
            });
    }

    handleOfficeChange(event) {
        this.selectedOffice = event.detail.value;
        this.selectedFloor = null;
        this.deskList = [];
        getFloors({ officeId: this.selectedOffice })
            .then(data => {
                this.floorOptions = data.map(floor => ({
                    label: floor.Name,
                    value: floor.Id
                }));
            })
            .catch(error => {
                console.error('Error fetching floors', error);
            });
    }

    handleFloorChange(event) {
        this.selectedFloor = event.detail.value;
        getDesks({ floorId: this.selectedFloor })
            .then(data => {
                this.deskList = data;
            })
            .catch(error => {
                console.error('Error fetching desks', error);
            });
    }
}