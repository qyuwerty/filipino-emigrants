import React from 'react';
import { 
  Users, Globe, MapPin, Briefcase, UserCheck, Heart, GraduationCap, Home 
} from 'lucide-react';

const DatasetNavigation = ({ activeDataset, setActiveDataset }) => {
  const datasets = [
    {
      id: 'age',
      label: 'Age',
      icon: Users,
      description: 'Age distribution data'
    },
    {
      id: 'all-countries',
      label: 'All Countries',
      icon: Globe,
      description: 'Complete country data'
    },
    {
      id: 'major-countries',
      label: 'Major Countries',
      icon: MapPin,
      description: 'Major destination countries'
    },
    {
      id: 'occupation',
      label: 'Occupation',
      icon: Briefcase,
      description: 'Occupation categories'
    },
    {
      id: 'sex',
      label: 'Sex',
      icon: UserCheck,
      description: 'Gender distribution'
    },
    {
      id: 'civil-status',
      label: 'Civil Status',
      icon: Heart,
      description: 'Marital status data'
    },
    {
      id: 'education',
      label: 'Education',
      icon: GraduationCap,
      description: 'Educational attainment'
    },
    {
      id: 'place-of-origin',
      label: 'Place of Origin',
      icon: Home,
      description: 'Geographic origins'
    }
  ];

  return (
    <div className="dataset-navigation">
      <div className="dataset-nav">
        {datasets.map((dataset) => {
          const Icon = dataset.icon;
          const isActive = activeDataset === dataset.id;
          
          return (
            <button
              key={dataset.id}
              className={`dataset-tab ${isActive ? 'dataset-tab--active' : ''}`}
              onClick={() => setActiveDataset(dataset.id)}
              title={dataset.description}
            >
              <Icon size={16} />
              <span>{dataset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DatasetNavigation;
