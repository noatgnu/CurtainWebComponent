import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {map, Observable, startWith} from 'rxjs';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {AsyncPipe} from '@angular/common';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-typeahead',
  imports: [
    MatFormField,
    MatInput,
    MatSelect,
    FormsModule,
    MatOption,
    ReactiveFormsModule,
    MatAutocompleteTrigger,
    MatAutocomplete,
    AsyncPipe,
    MatLabel,
    MatButton
  ],
  templateUrl: './typeahead.component.html',
  styleUrl: './typeahead.component.scss'
})
export class TypeaheadComponent implements OnInit{
  @Input() allGenes: string[] = [];
  @Input() accessionList: string[] = [];
  @Input() primaryIDsList: string[] = [];
  @Input() placeholder: string = 'Search...';
  @Input() set mode(value: string) {
    if (value === 'ptm') {
      this.filterTypeOptions = ['Primary IDs', 'Genes', 'Accessions']
    }
  }


  filterType: string = 'Genes';
  filterTypeOptions: string[] = ['Primary IDs', 'Genes'];
  filteredOptions!: Observable<string[]>;

  form: FormGroup
  @Output() searchEvent = new EventEmitter<string>()
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      search: ["", Validators.required],
      filterType: ["Genes", Validators.required]
    })

  }

  ngOnInit() {
    this.filteredOptions = this.form.controls["search"].valueChanges.pipe(
      map(value =>
        {
          if (value === null) {
            return []
          }
          return this._filter(value).slice(0, 10)
        }
      )
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    switch (this.filterType) {

      case 'Primary IDs':
        return this.primaryIDsList.filter(option =>
          option.toLowerCase().includes(filterValue)
        );
      case 'Genes':
        return this.allGenes.filter(option =>
          option.toLowerCase().includes(filterValue)
        );
      case 'Accessions':
        return this.accessionList.filter(option =>
          option.toLowerCase().includes(filterValue)
        );
      default:
        return [];

    }

  }

  emitSearch() {
    if (this.form.valid) {
      this.searchEvent.emit(this.form.value)
    }
  }
}
